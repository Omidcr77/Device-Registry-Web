import React, { useState, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Palette, Save, QrCode, Sun, Moon, Laptop, Undo2, FileText } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Card } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import * as api from '../lib/api';
import { useTheme } from '../lib/theme-context';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    deviceAlerts: true,
    systemUpdates: true,
    pollIntervalSec: 60,
  });

  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    bannerDurationSec: 10,
    stickyOffsetPx: 64,
  });

  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
  });

  const [loading, setLoading] = useState(false);
  const [twoFactorQR, setTwoFactorQR] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<any | null>(null);
  const [deviceImportError, setDeviceImportError] = useState<string | null>(null);
  const [userImportError, setUserImportError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  // Keep the toggle in sync with actual browser permission/support on first load
  useEffect(() => {
    try {
      if (!('Notification' in window)) {
        if (notifications.push) setNotifications(prev => ({ ...prev, push: false }));
        return;
      }
      if (Notification.permission !== 'granted' && notifications.push) {
        setNotifications(prev => ({ ...prev, push: false }));
      }
    } catch {}
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data && typeof data === 'object') {
        if (data.notifications) setNotifications(data.notifications);
        if (data.preferences) {
          setPreferences(data.preferences);
          if (data.preferences.theme) setTheme(data.preferences.theme);
        }
        if (data.security) setSecurity(data.security);
        setBaseline(data);
      } else {
        // If API returns nothing, seed baseline from current local defaults to enable saving
        const seed = { notifications, preferences, security } as any;
        setBaseline(seed);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Seed baseline to allow user to save defaults even if load failed
      try { setBaseline({ notifications, preferences, security } as any); } catch {}
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const settings = { notifications, preferences, security };
      await api.updateSettings(settings);
      setTheme(preferences.theme as 'light' | 'dark' | 'system');
      toast.success('Settings saved successfully');
      setBaseline(settings);
      try {
        const evt = new CustomEvent('user-settings-updated', { detail: settings });
        window.dispatchEvent(evt);
      } catch {}
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  // Check browser capabilities and, if needed, request permission.
  // Returns true only when push-style notifications are actually usable.
  const ensurePushNotificationsEnabled = async (): Promise<boolean> => {
    try {
      if (!('Notification' in window)) {
        toast.error('Push notifications not supported by this browser');
        return false;
      }

      // Secure context is required for Notification/Push APIs (except localhost)
      const isLocalhost = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
      if (!window.isSecureContext && !isLocalhost) {
        toast.error('Push requires HTTPS (or localhost)');
        return false;
      }

      // Push notifications for web apps also require Service Worker capability
      const swSupported = 'serviceWorker' in navigator;
      const pushMgrSupported = 'PushManager' in (window as any);
      if (!swSupported || !pushMgrSupported) {
        toast.error('Push requires Service Worker + PushManager support');
        return false;
      }

      // If the site is already granted, we are good
      if (Notification.permission === 'granted') return true;

      if (Notification.permission === 'denied') {
        toast.error('Push blocked in browser settings');
        return false;
      }

      // Otherwise request permission as part of a user gesture
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Push notifications enabled');
        return true;
      }

      toast.error('Push notifications denied');
      return false;
    } catch {
      toast.error('Unable to enable push notifications');
      return false;
    }
  };

  const setupTwoFactor = () => {
    // Mock QR code generation
    setTwoFactorQR('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
  };

  // Helpers for CSV templates and validation
  const downloadTextFile = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const devicesSampleCsv = `code,type,name,customer,location,installDate,ip\nDEV-001,Router,Core Router,Acme HQ,DataCenter,2025-01-15,10.0.0.1\nDEV-002,Switch,Floor Switch,Acme HQ,Floor 3,2025-02-01,10.0.3.5\n`;
  const usersSampleCsv = `email,role,locations,status,name,password\nmanager@example.com,MANAGER,"[\"HQ\",\"DC1\"]",ACTIVE,Manager One,$2b$10$replace_with_bcrypt_hash\nviewer@example.com,VIEWER,[],ACTIVE,Viewer One,$2b$10$replace_with_bcrypt_hash\n`;

  const parseHeader = (text: string): string[] => {
    const firstLine = (text.split(/\r?\n/, 1)[0] || '').trim();
    if (!firstLine) return [];
    return firstLine
      .split(',')
      .map((h) => h.trim().replace(/^"|"$/g, ''));
  };
  const normalizeCols = (cols: string[]) => cols.map((c) => c.toLowerCase().replace(/\s+/g, '').replace(/_/g, ''));

  const hasChanges = useMemo(() => {
    if (!baseline) return false;
    try {
      const current = { notifications, preferences, security } as any;
      return JSON.stringify(current) !== JSON.stringify(baseline);
    } catch {
      return true;
    }
  }, [baseline, notifications, preferences, security]);

  const resetToBaseline = () => {
    if (!baseline) return;
    try {
      if (baseline.notifications) setNotifications(baseline.notifications);
      if (baseline.preferences) {
        setPreferences(baseline.preferences);
        if (baseline.preferences.theme) setTheme(baseline.preferences.theme);
      }
      if (baseline.security) setSecurity(baseline.security);
      toast.message('Reverted changes');
    } catch {}
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 dark:text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Settings
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage notifications, preferences, and security for your account.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={resetToBaseline}
            variant="outline"
            className="gap-2"
            disabled={!hasChanges || loading}
            title="Reset unsaved changes"
          >
            <Undo2 className="w-4 h-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || loading} className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Notifications */}
      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Control how and when the app notifies you.</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div>
              <Label htmlFor="email-notif">Email Notifications</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications via email</p>
            </div>
            <Switch
              id="email-notif"
              checked={notifications.email}
              onCheckedChange={(checked: boolean) => setNotifications(prev => ({ ...prev, email: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div>
              <Label htmlFor="push-notif">Push Notifications</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive push notifications in browser</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="push-notif"
                checked={notifications.push}
                onCheckedChange={async (checked: boolean) => {
                  if (!checked) {
                    setNotifications(prev => ({ ...prev, push: false }));
                    return;
                  }

                  const ok = await ensurePushNotificationsEnabled();
                  setNotifications(prev => ({ ...prev, push: ok }));
                }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div>
              <Label htmlFor="device-alerts">Device Alerts</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get notified about device status changes</p>
            </div>
            <Switch
              id="device-alerts"
              checked={notifications.deviceAlerts}
              onCheckedChange={(checked: boolean) => setNotifications(prev => ({ ...prev, deviceAlerts: checked }))}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div>
              <Label htmlFor="system-updates">System Updates</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Receive notifications about system updates</p>
            </div>
            <Switch
              id="system-updates"
              checked={notifications.systemUpdates}
              onCheckedChange={(checked: boolean) => setNotifications(prev => ({ ...prev, systemUpdates: checked }))}
            />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="poll-interval">Status Check Interval</Label>
              <Select
                value={String(notifications.pollIntervalSec)}
                onValueChange={(value: string) => setNotifications(prev => ({ ...prev, pollIntervalSec: parseInt(value, 10) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">Every 15 seconds</SelectItem>
                  <SelectItem value="30">Every 30 seconds</SelectItem>
                  <SelectItem value="60">Every 1 minute</SelectItem>
                  <SelectItem value="120">Every 2 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          </div>
        </div>
      </Card>

      {/* Preferences */}
      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Palette className="w-5 h-5 text-green-600 dark:text-green-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Personalize theme, language and display options.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setPreferences(prev => ({ ...prev, theme: 'light' })); setTheme('light'); }}
                aria-pressed={preferences.theme === 'light'}
                className={'flex items-center gap-2 px-3 py-2 rounded-lg border ' + (preferences.theme === 'light' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50')}
                title="Light"
              >
                <Sun className="w-4 h-4" /> Light
              </button>
              <button
                type="button"
                onClick={() => { setPreferences(prev => ({ ...prev, theme: 'dark' })); setTheme('dark'); }}
                aria-pressed={preferences.theme === 'dark'}
                className={'flex items-center gap-2 px-3 py-2 rounded-lg border ' + (preferences.theme === 'dark' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50')}
                title="Dark"
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
              <button
                type="button"
                onClick={() => { setPreferences(prev => ({ ...prev, theme: 'system' })); setTheme('system'); }}
                aria-pressed={preferences.theme === 'system'}
                className={'flex items-center gap-2 px-3 py-2 rounded-lg border ' + (preferences.theme === 'system' ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-slate-800/50')}
                title="System"
              >
                <Laptop className="w-4 h-4" /> System
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Theme applies immediately; remember to save to persist.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select value={preferences.language} onValueChange={(value: string) => setPreferences(prev => ({ ...prev, language: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={preferences.timezone} onValueChange={(value: string) => setPreferences(prev => ({ ...prev, timezone: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="EST">Eastern Time</SelectItem>
                <SelectItem value="PST">Pacific Time</SelectItem>
                <SelectItem value="GMT">GMT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-format">Date Format</Label>
            <Select value={preferences.dateFormat} onValueChange={(value: string) => setPreferences(prev => ({ ...prev, dateFormat: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="banner-duration">Alert Banner Duration</Label>
            <Select value={String(preferences.bannerDurationSec)} onValueChange={(value: string) => setPreferences(prev => ({ ...prev, bannerDurationSec: parseInt(value, 10) }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 seconds</SelectItem>
                <SelectItem value="10">10 seconds</SelectItem>
                <SelectItem value="20">20 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sticky-offset">Sticky Filters Offset</Label>
            <Select value={String(preferences.stickyOffsetPx)} onValueChange={(value: string) => setPreferences(prev => ({ ...prev, stickyOffsetPx: parseInt(value, 10) }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="56">56 px (3.5rem)</SelectItem>
                <SelectItem value="64">64 px (4rem)</SelectItem>
                <SelectItem value="80">80 px (5rem)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Security */}
      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <Shield className="w-5 h-5 text-red-600 dark:text-red-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Protect your account with 2FA and sensible session limits.</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
            <div>
              <Label htmlFor="two-factor">Two-Factor Authentication</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="two-factor"
                checked={security.twoFactor}
                onCheckedChange={(checked: boolean) => setSecurity(prev => ({ ...prev, twoFactor: checked }))}
              />
              {security.twoFactor && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" onClick={setupTwoFactor}>
                      <QrCode className="w-4 h-4 mr-2" />
                      Setup
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Scan the QR code below with your authenticator app to enable 2FA.
                      </p>
                      {twoFactorQR && (
                        <div className="flex justify-center">
                          <img src={twoFactorQR} alt="2FA QR Code" className="w-48 h-48" />
                        </div>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        This is a mock implementation. In a real app, this would generate a unique QR code for your account.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
            <Select value={security.sessionTimeout} onValueChange={(value: string) => setSecurity(prev => ({ ...prev, sessionTimeout: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-expiry">Password Expiry (days)</Label>
            <Select value={security.passwordExpiry} onValueChange={(value: string) => setSecurity(prev => ({ ...prev, passwordExpiry: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Data Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Import devices and backup/restore users as CSV.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Import Devices (CSV)</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Expected columns: code,type,name,customer,location,installDate,ip</p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  // Basic validation
                  const cols = normalizeCols(parseHeader(text));
                  const required = ['code','type','name','customer','location','installdate','ip'];
                  const missing = required.filter((r) => !cols.includes(r));
                  if (missing.length) {
                    const msg = `Invalid CSV header. Missing: ${missing.join(', ')}`;
                    setDeviceImportError(msg);
                    toast.error(msg);
                    return;
                  }
                  setDeviceImportError(null);
                  const result = await api.importDevicesCsv(text);
                  toast.success(`Devices import: ${result.created || 0} created, ${result.updated || 0} updated`);
                } catch (err: any) {
                  const msg = err?.message || 'Failed to import devices';
                  setDeviceImportError(msg);
                  toast.error(msg);
                } finally {
                  e.currentTarget.value = '';
                }
              }}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-200 dark:file:border-gray-700 file:text-sm file:bg-gray-50 dark:file:bg-slate-800 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-slate-700"
            />
            {deviceImportError && (
              <p className="text-sm text-red-600 dark:text-red-400">{deviceImportError}</p>
            )}
            <div>
              <Button variant="outline" size="sm" onClick={() => downloadTextFile('devices_sample.csv', devicesSampleCsv)}>
                Download sample CSV
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Export Users (CSV)</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Includes roles, locations and hashed passwords for restore.</p>
            <div>
              <Button
                onClick={async () => {
                  try {
                    const { blob, filename } = await api.exportUsersCsvBlob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = filename || 'users_export.csv';
                    document.body.appendChild(a); a.click(); a.remove();
                    URL.revokeObjectURL(url);
                    toast.success('User export started');
                  } catch (e: any) {
                    toast.error(e?.message || 'Failed to export users');
                  }
                }}
              >
                Download CSV
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Import Users (CSV)</Label>
            <p className="text-xs text-gray-600 dark:text-gray-400">Columns: email,role,locations,status,name,password (hashed)</p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const text = await file.text();
                  const cols = normalizeCols(parseHeader(text));
                  const required = ['email','password'];
                  const missing = required.filter((r) => !cols.includes(r));
                  if (missing.length) {
                    const msg = `Invalid CSV header. Missing: ${missing.join(', ')}`;
                    setUserImportError(msg);
                    toast.error(msg);
                    return;
                  }
                  setUserImportError(null);
                  const result = await api.importUsersCsv(text);
                  toast.success(`Users import: ${result.created || 0} created, ${result.updated || 0} updated`);
                } catch (err: any) {
                  const msg = err?.message || 'Failed to import users';
                  setUserImportError(msg);
                  toast.error(msg);
                } finally {
                  e.currentTarget.value = '';
                }
              }}
              className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-gray-200 dark:file:border-gray-700 file:text-sm file:bg-gray-50 dark:file:bg-slate-800 file:text-gray-700 dark:file:text-gray-200 hover:file:bg-gray-100 dark:hover:file:bg-slate-700"
            />
            {userImportError && (
              <p className="text-sm text-red-600 dark:text-red-400">{userImportError}</p>
            )}
            <div>
              <Button variant="outline" size="sm" onClick={() => downloadTextFile('users_sample.csv', usersSampleCsv)}>
                Download sample CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Sticky actions for small screens */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur p-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-end gap-2">
          <Button
            onClick={resetToBaseline}
            variant="outline"
            className="gap-2"
            disabled={!hasChanges || loading}
            title="Reset unsaved changes"
          >
            <Undo2 className="w-4 h-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || loading} className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
};
