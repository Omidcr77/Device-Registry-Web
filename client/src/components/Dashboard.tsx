import React, { useEffect, useState, useCallback } from 'react';
import * as api from '../lib/api';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { StatsCards } from './StatsCards';
import { DeviceList } from './DeviceList';
import { AdminPanel } from './AdminPanel';
import { UserProfile } from './UserProfile';
import { Settings } from './Settings';
import { Reports } from './Reports';
import { FileText, Settings as SettingsIcon, User, Bell, Menu } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardProps {
  onLogout: () => void;
}

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  status: string;
  locations: string[];
  settings: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [alerts, setAlerts] = useState<Array<{ title: string; body?: string; at: string }>>([]);
  const [mutedDeviceIds, setMutedDeviceIds] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(false);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [offlineCount, setOfflineCount] = useState<number | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectRef = React.useRef<number>(1000);
  const reconnectTimerRef = React.useRef<number | null>(null);
  const aliveRef = React.useRef<boolean>(false);
  const lastReachableRef = React.useRef<Record<string, boolean | null>>({});
  const wsInitializedRef = React.useRef<boolean>(false);
  const wsConnectedAtRef = React.useRef<number>(0);
  const userLastSeenRef = React.useRef<Record<string, number>>({});
  const [usersOnlineCount, setUsersOnlineCount] = useState<number | null>(null);
  const prevCountsRef = React.useRef<{ total?: number; online?: number; offline?: number; users?: number }>({});
  const [lastUpdatedTs, setLastUpdatedTs] = useState<number | null>(null);

  // React to settings saved in the Settings component
  useEffect(() => {
    const handler = (e: any) => {
      const newSettings = e?.detail;
      if (!newSettings) return;
      setCurrentUser((prev) => prev ? { ...prev, settings: { ...(prev.settings || {}), ...newSettings } } : prev);
    };
    window.addEventListener('user-settings-updated', handler as any);
    return () => window.removeEventListener('user-settings-updated', handler as any);
  }, []);

  // Load persisted muted devices only (alerts are session-scoped now)
  useEffect(() => {
    try {
      const savedMuted = localStorage.getItem('mutedDevices');
      if (savedMuted) {
        const arr = JSON.parse(savedMuted);
        if (Array.isArray(arr)) setMutedDeviceIds(new Set(arr));
      }
    } catch {}
  }, []);

  // Clear alerts if user is not an Admin (defensive in case of role change)
  useEffect(() => {
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
    if (!isAdmin && alerts.length) setAlerts([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  // Persist muted list; alerts are not persisted to avoid stale notifications on reload
  useEffect(() => {
    if (alerts.length) {
      setShowBanner(true);
      const duration = Math.max(2, Number(currentUser?.settings?.preferences?.bannerDurationSec ?? 10)) * 1000;
      const t = setTimeout(() => setShowBanner(false), duration);
      return () => clearTimeout(t);
    }
  }, [alerts, currentUser?.settings?.preferences?.bannerDurationSec]);
  useEffect(() => {
    try { localStorage.setItem('mutedDevices', JSON.stringify(Array.from(mutedDeviceIds))); } catch {}
  }, [mutedDeviceIds]);

  const handleMuteDevice = (id: string) => {
    setMutedDeviceIds((prev) => new Set(prev).add(id));
    toast.message('Muted device alerts');
  };

  const handleOffline = (d: { id: string; name: string; ip?: string }) => {
    // Only Admins receive notifications
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
    if (!isAdmin) return;
    if (d.id && mutedDeviceIds.has(d.id)) return; // respect mute
    const allowPush = !!currentUser?.settings?.notifications?.push;
    const allowToast = currentUser?.settings?.notifications?.deviceAlerts !== false;
    const label = `${d.name}${d.ip ? ' (' + d.ip + ')' : ''}`;
    if (allowToast) toast.error(`Device offline: ${label}`);
    if (allowPush && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Device offline', { body: label }); } catch {}
    }
    setAlerts((prev) => [
      { title: `Offline: ${d.name}`, body: d.ip, at: new Date().toLocaleString(), id: d.id } as any,
      ...prev,
    ].slice(0, 50));
  };

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const refreshDevices = useCallback(() => {
    setLoading(true);
    api.getDevices({ search: debouncedSearchQuery })
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setDevices(data.items);
        } else {
          setDevices([]);
        }
      })
      .catch(() => setDevices([]))
      .finally(() => setLoading(false));
  }, [debouncedSearchQuery]);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  // WebSocket realtime: device status + user-auth (Admin-only; disabled on Login)
  useEffect(() => {
    const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
    // If not logged in or not admin, do not connect WS
    if (!currentUser?.id || !isAdmin) {
      try { wsRef.current?.close(); } catch {}
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      return;
    }

    aliveRef.current = true;
    const connect = () => {
      try {
        const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
        wsRef.current = ws;
        ws.onopen = () => { reconnectRef.current = 1000; wsConnectedAtRef.current = Date.now(); };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data as any);
            if (msg?.type === 'user-auth') {
              const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
              const role = (msg.user?.role || '').toUpperCase();
              const isOther = msg.user?.id && msg.user.id !== currentUser?.id;
              const allowSystem = currentUser?.settings?.notifications?.systemUpdates !== false;
              if (isAdmin && isOther && allowSystem && (role === 'MANAGER' || role === 'VIEWER')) {
                const act = msg.action === 'logout' ? 'logged out' : 'logged in';
                const uname = (msg.user?.username || '').trim();
                toast.message(`User ${uname} ${act}`);
                // Also persist into bell alerts
                setAlerts((prev) => [
                  { title: `User ${act}`, body: uname, at: new Date().toLocaleString() } as any,
                  ...prev,
                ].slice(0, 50));
                // Play a short beep
                try {
                  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const o = ctx.createOscillator();
                  const g = ctx.createGain();
                  o.type = 'sine'; o.frequency.value = msg.action === 'logout' ? 440 : 660; // different tones
                  o.connect(g); g.connect(ctx.destination);
                  g.gain.setValueAtTime(0.0001, ctx.currentTime);
                  g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
                  o.start();
                  o.stop(ctx.currentTime + 0.15);
                } catch {}
              }
              // Track online users (approx) for admin stats card
              const uid = String(msg.user?.id || '');
              if (uid) {
                if (msg.action === 'login') userLastSeenRef.current[uid] = Date.now();
                if (msg.action === 'logout') delete userLastSeenRef.current[uid];
                const count = Object.keys(userLastSeenRef.current).filter((id) => id !== currentUser?.id).length;
                setUsersOnlineCount(count);
              }
            } else if (msg?.type === 'device-status') {
              const id = String(msg.deviceId || '');
              if (!id) return;
              const reachable = msg.reachable === true;
              const suppressed = msg.suppressed === true;
              const prev = lastReachableRef.current[id];
              // Seed without notifying on the very first message per device
              if (typeof prev === 'undefined') {
                lastReachableRef.current[id] = reachable;
                return;
              }
              // Determine if the change is recent (real-time) based on lastChangeAt
              const changeAt = msg.lastChangeAt ? new Date(msg.lastChangeAt).getTime() : null;
              const isRecent = typeof changeAt === 'number' && changeAt >= (wsConnectedAtRef.current || 0) - 1000;

              // Only notify on a transition true -> false, recent, and when not suppressed
              if (prev === true && reachable === false && !suppressed && isRecent) {
                // Try to find the device details for nicer label
                const d = devices.find((x: any) => String(x.id) === id);
                if (d) {
                  handleOffline({ id: id, name: d.name, ip: d.ip });
                } else {
                  handleOffline({ id: id, name: `Device ${id}` });
                }
              } else if (prev === false && reachable === true && isRecent) {
                // Back online: add to bell for admins (no toast)
                const isAdmin = (currentUser?.role || '').toUpperCase() === 'ADMIN';
                if (isAdmin) {
                  const d = devices.find((x: any) => String(x.id) === id);
                  const title = `Back online: ${d?.name || id}`;
                  const body = d?.ip;
                  setAlerts((prev) => [
                    { title, body, at: new Date().toLocaleString(), id, ts: Date.now() } as any,
                    ...prev,
                  ].slice(0, 50));
                }
              }
              // Update last known state
              lastReachableRef.current[id] = reachable;
            }
          } catch {}
        };
        ws.onclose = () => {
          if (!aliveRef.current) return;
          const delay = Math.min(reconnectRef.current, 15000);
          reconnectTimerRef.current = window.setTimeout(() => {
            if (!aliveRef.current) return;
            connect();
          }, delay) as any;
          reconnectRef.current = delay * 2;
        };
        ws.onerror = () => { try { ws.close(); } catch {} };
      } catch {}
    };
    connect();
    return () => {
      aliveRef.current = false;
      try { wsRef.current?.close(); } catch {}
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role]);

  // Compute online/offline summary for currently loaded devices (backend aggregate)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!devices || devices.length === 0) {
        setOnlineCount(0);
        setOfflineCount(0);
        return;
      }
      setOnlineLoading(true);
      try {
        const ids = devices.map((d: any) => String(d.id)).filter(Boolean);
        const summary = await api.getStatusSummary(ids);
        if (cancelled) return;
        const on = Number(summary?.online ?? 0);
        const off = Number(summary?.offline ?? 0);
        setOnlineCount(on);
        setOfflineCount(off);
        setLastUpdatedTs(Date.now());
        prevCountsRef.current.total = devices.length;
        prevCountsRef.current.online = on;
        prevCountsRef.current.offline = off;
      } catch {
        if (!cancelled) { setOnlineCount(null as any); setOfflineCount(null as any); }
      } finally {
        if (!cancelled) setOnlineLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [devices]);

  // Prune stale online users (seen via WS) every minute (15 min TTL)
  useEffect(() => {
    const ttlMs = 15 * 60 * 1000;
    const id = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [uid, ts] of Object.entries(userLastSeenRef.current)) {
        if (now - (ts || 0) > ttlMs) { delete userLastSeenRef.current[uid]; changed = true; }
      }
      if (changed) {
        const count = Object.keys(userLastSeenRef.current).filter((id) => id !== currentUser?.id).length;
        setUsersOnlineCount(count);
      }
    }, 60000);
    return () => window.clearInterval(id);
  }, [currentUser?.id]);

  // Fetch current user info
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userData = await api.me();
        setCurrentUser(userData);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            {showBanner && alerts.length > 0 && (
              <div className="mb-4 rounded-xl border bg-amber-50/85 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 border-amber-200 dark:border-amber-700 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  <span>{alerts.length} device{alerts.length>1?'s':''} reported offline recently</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="text-sm underline" onClick={() => setActiveTab('devices')}>View</button>
                  <button className="text-sm underline" onClick={() => setShowBanner(false)}>Dismiss</button>
                </div>
              </div>
            )}
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h3>
            </div>
            <StatsCards
              devices={devices}
              onlineCount={onlineCount ?? undefined}
              offlineCount={offlineCount ?? undefined}
              usersOnlineCount={((currentUser?.role || '').toUpperCase() === 'ADMIN') ? (usersOnlineCount ?? undefined) : undefined}
              isAdmin={(currentUser?.role || '').toUpperCase() === 'ADMIN'}
              loading={loading || onlineLoading}
              deltas={{
                totalDelta: typeof prevCountsRef.current.total === 'number' ? (devices.length - (prevCountsRef.current.total || 0)) : undefined,
                onlineDelta: typeof prevCountsRef.current.online === 'number' ? ((onlineCount ?? 0) - (prevCountsRef.current.online || 0)) : undefined,
                offlineDelta: typeof prevCountsRef.current.offline === 'number' ? ((offlineCount ?? 0) - (prevCountsRef.current.offline || 0)) : undefined,
                usersDelta: undefined,
              }}
              lastUpdatedTs={lastUpdatedTs}
            />
            <div className="mt-6 mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Devices</h3>
            </div>
            <DeviceList
              devices={devices}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onDevicesChange={refreshDevices}
              canManageDevices={['ADMIN','MANAGER'].includes((currentUser?.role || '').toUpperCase())}
              pollIntervalMs={Math.max(5000, ((currentUser?.settings?.notifications?.pollIntervalSec ?? 60) as number) * 1000)}
              stickyOffsetPx={Number(currentUser?.settings?.preferences?.stickyOffsetPx ?? 64)}
            />
          </>
        );
      case 'devices':
        return (
          <DeviceList
            devices={devices}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onDevicesChange={refreshDevices}
            canManageDevices={['ADMIN','MANAGER'].includes((currentUser?.role || '').toUpperCase())}
            pollIntervalMs={Math.max(5000, ((currentUser?.settings?.notifications?.pollIntervalSec ?? 60) as number) * 1000)}
            stickyOffsetPx={Number(currentUser?.settings?.preferences?.stickyOffsetPx ?? 64)}
          />
        );
      case 'profile':
        return <UserProfile />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'admin':
        return (currentUser && (currentUser.role || '').toUpperCase() === 'ADMIN') ? <AdminPanel onlineUsers={usersOnlineCount ?? undefined} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Navbar
        onLogout={onLogout}
        currentUser={currentUser}
        alertCount={alerts.length}
        alerts={alerts as any}
        onMarkAllRead={() => setAlerts([])}
        onClearAlerts={() => setAlerts([])}
        onMuteDevice={(id) => handleMuteDevice(id)}
        onUnmuteDevice={(id) => setMutedDeviceIds((prev) => { const n = new Set(prev); n.delete(id); return n; })}
        mutedDeviceIds={Array.from(mutedDeviceIds)}
        onTabChange={setActiveTab}
        isMobileMenuOpen={isMobileMenuOpen}
        onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onlineCount={typeof onlineCount === 'number' ? onlineCount : undefined}
        offlineCount={typeof offlineCount === 'number' ? offlineCount : undefined}
      />
      <div className="flex">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isAdmin={(currentUser?.role || '').toUpperCase() === 'ADMIN'}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};




