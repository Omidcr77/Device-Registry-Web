import React, { useEffect, useRef, useState } from 'react';
import { Moon, Sun, LogOut, User as UserIcon, Settings, Shield, Menu, X, Bell } from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { GlobalSearch } from './GlobalSearch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  locations: string[];
  settings: any;
}

interface NavbarProps {
  onLogout: () => void;
  onTabChange?: (tab: string) => void;
  currentUser?: User | null;
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
  alertCount?: number;
  alerts?: Array<{ id?: string; title: string; body?: string; at: string }>;
  onClearAlerts?: () => void;
  onMuteDevice?: (id: string) => void;
  onUnmuteDevice?: (id: string) => void;
  mutedDeviceIds?: string[];
  onMarkAllRead?: () => void;
  onlineCount?: number;
  offlineCount?: number;
}

const getInitials = (nameOrEmail?: string) => {
  if (!nameOrEmail) return 'U';
  const parts = nameOrEmail.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

export const Navbar: React.FC<NavbarProps> = ({
  onLogout,
  onTabChange,
  currentUser,
  isMobileMenuOpen,
  onMobileMenuToggle,
  alertCount = 0,
  alerts = [],
  onClearAlerts,
  onMuteDevice,
  onUnmuteDevice,
  mutedDeviceIds = [],
  onMarkAllRead,
  onlineCount,
  offlineCount,
}) => {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const awaitingGoRef = useRef(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true } as any);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!onTabChange) return;
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K for global search
      const key = (typeof e.key === 'string' ? e.key : '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'k') { e.preventDefault(); setSearchOpen(true); return; }
      // ? for help
      if (!e.ctrlKey && !e.metaKey && key === '?') { e.preventDefault(); setHelpOpen(true); return; }
      if (!awaitingGoRef.current) {
        if (key === 'g') awaitingGoRef.current = true;
        return;
      }
      awaitingGoRef.current = false;
      const map: Record<string, string> = { d: 'dashboard', v: 'devices', s: 'settings', a: 'admin', r: 'reports', p: 'profile' };
      if (map[key]) {
        e.preventDefault();
        onTabChange(map[key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onTabChange]);

  const displayName = currentUser?.name || currentUser?.email || 'User';
  const isAdmin = (currentUser?.role || '').toLowerCase() === 'admin';
  const status = (currentUser?.status || 'active').toLowerCase();

  return (
    <>
    <header className={(scrolled ? 'bg-white/85 dark:bg-slate-900/85 shadow-sm ' : 'bg-white/60 dark:bg-slate-900/60 ') + 'sticky top-0 z-40 backdrop-blur border-b border-gray-200 dark:border-slate-800 transition-colors'}>
      <div className="h-16 px-3 sm:px-4 md:px-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden rounded-xl"
          onClick={onMobileMenuToggle}
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <button
          className="flex items-center min-w-0 hover:opacity-90 transition-opacity"
          onClick={() => onTabChange?.('dashboard')}
          aria-label="Go to Dashboard"
        >
          <div className="font-semibold truncate text-gray-900 dark:text-white tracking-tight">
            ICT Device Registry
          </div>
        </button>

        <div className="flex-1" />

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* Notifications are visible to Admins only */}
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                  aria-label="Open notifications"
                  title="Alerts"
                >
                  <Bell className="w-5 h-5" />
                  {alertCount > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] h-5 min-w-[1.25rem] px-1">
                      {Math.min(alertCount, 99)}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 max-h-80 overflow-auto">
                <DropdownMenuLabel>
                  <div className="flex items-center justify-between">
                    <span>Alerts</span>
                    <span className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        Online {typeof onlineCount === 'number' ? onlineCount : ''}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        Offline {typeof offlineCount === 'number' ? offlineCount : ''}
                      </span>
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {alerts.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">No alerts</div>
                ) : (
                  <div className="py-1">
                    {(showAllAlerts ? alerts : alerts.slice(0, 5)).map((a, i) => (
                      <div key={i} className="px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm text-gray-900 dark:text-white">{a.title}</div>
                            {a.body && <div className="text-xs text-gray-500 dark:text-gray-400">{a.body}</div>}
                            <div className="text-[10px] text-gray-400">{a.at}</div>
                          </div>
                          {a.id && (
                            (mutedDeviceIds.includes(a.id)) ? (
                              <button
                                className="text-xs underline text-gray-600 dark:text-gray-300 hover:text-gray-900"
                                onClick={() => a.id && onUnmuteDevice?.(a.id)}
                              >
                                Unmute
                              </button>
                            ) : (
                              <button
                                className="text-xs underline text-gray-600 dark:text-gray-300 hover:text-gray-900"
                                onClick={() => a.id && onMuteDevice?.(a.id)}
                              >
                                Mute
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <DropdownMenuSeparator />
                {alerts.length > 5 && (
                  <DropdownMenuItem onClick={() => setShowAllAlerts((v) => !v)}>
                    {showAllAlerts ? 'View less' : `View more (${alerts.length - 5} more)`}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onMarkAllRead?.()}>Mark all as read</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onClearAlerts?.()}>Clear All</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-800 px-2 sm:px-3 py-2 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                aria-label="Open user menu"
                title={displayName}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col min-w-0 text-left">
                  <div className="truncate text-gray-900 dark:text-white text-sm font-medium">{displayName}</div>
                  <div className="flex items-center gap-2 text-xs">
                    {isAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                        <Shield className="w-3.5 h-3.5" /> Admin
                      </span>
                    )}
                    <span
                      className={
                        'inline-flex rounded-md px-2 py-0.5 ' +
                        (status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')
                      }
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>
                <div className="flex items-center gap-3 py-1">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium truncate text-gray-900 dark:text-white">{displayName}</div>
                    {currentUser?.email && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.email}</div>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      {isAdmin && (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-[10px]">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      )}
                      <span className={'inline-flex rounded-md px-2 py-0.5 text-[10px] ' + (status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300')}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTabChange?.('profile')}>
                <UserIcon className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onTabChange?.('settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
    <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
          <div>
            <div className="font-medium mb-1">Navigation</div>
            <div><code>g</code> then <code>d</code> — Dashboard</div>
            <div><code>g</code> then <code>v</code> — Devices</div>
            <div><code>g</code> then <code>s</code> — Settings</div>
            <div><code>g</code> then <code>a</code> — Admin</div>
            <div><code>g</code> then <code>r</code> — Reports</div>
            <div><code>g</code> then <code>p</code> — Profile</div>
          </div>
          <div>
            <div className="font-medium mb-1">Actions</div>
            <div><code>Ctrl/Cmd</code> + <code>K</code> — Global search</div>
            <div><code>?</code> — Show this help</div>
            <div>Double‑click cell — Inline edit (name/location)</div>
            <div><code>Enter</code>/<code>Esc</code> — Save/Cancel inline edit</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
