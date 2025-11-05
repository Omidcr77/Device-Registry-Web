import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, MapPin, Shield, Calendar, Lock, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import * as api from '../lib/api';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface UserProfileShape {
  id: string;
  username: string;
  name?: string;
  role: string;
  locations: string[];
  status: string;
  createdAt?: string | null;
}

export const UserProfile: React.FC = () => {
  const [user, setUser] = useState<UserProfileShape | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editLocations, setEditLocations] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setUser(me);
        setEditName(me.name || '');
        setEditUsername(me.username);
        setEditLocations((me.locations || []).join(', '));
      } catch {
        toast.error('Failed to load profile');
      }
    })();
  }, []);

  const initials = (name?: string, username?: string) => {
    const n = (name || '').trim();
    if (n) {
      const parts = n.split(/\s+/).filter(Boolean);
      const first = parts[0]?.[0] || '';
      const second = parts[1]?.[0] || '';
      return (first + second).toUpperCase() || first.toUpperCase() || 'U';
    }
    const un = (username || '').trim();
    if (un) return un[0].toUpperCase();
    return 'U';
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      const locations = editLocations
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);
      await api.updateUser(user.id, { username: editUsername, locations, name: editName } as any);
      toast.success('Profile updated');
      setIsEditing(false);
      const updated = await api.me();
      setUser(updated);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    }
  };

  const changePassword = async () => {
    if (!user) return;
    if (!newPassword) return toast.error('Please enter a new password');
    if (newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    try {
      await api.changePassword(user.id, newPassword);
      toast.success('Password changed');
      setIsChangingPassword(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to change password');
    }
  };

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
      manager: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      tech: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
      user: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return <Badge className={map[role] || map.user}>{role[0].toUpperCase() + role.slice(1)}</Badge>;
  };

  const statusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    const cls =
      s === 'active'
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return <Badge className={cls}>{s ? s[0].toUpperCase() + s.slice(1) : '—'}</Badge>;
  };

  if (!user) {
    return <div className="flex items-center justify-center h-72 text-gray-500 dark:text-gray-400">Loading profile...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-gray-900 dark:text-white text-lg font-semibold">User Profile</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsChangingPassword((v) => !v)}
            variant={isChangingPassword ? 'outline' : 'default'}
            className={isChangingPassword ? '' : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700'}
          >
            <Lock className="w-4 h-4 mr-2" />
            {isChangingPassword ? 'Cancel' : 'Change Password'}
          </Button>
          <Button
            onClick={() => setIsEditing((v) => !v)}
            variant={isEditing ? 'outline' : 'default'}
            className={isEditing ? '' : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20 ring-2 ring-white/50 dark:ring-white/10 shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xl font-semibold">
              {initials(user.name, user.username)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-4">
            {isChangingPassword ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-pass">New Password *</Label>
                  <Input id="new-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <p className="text-xs text-gray-500 dark:text-gray-400">At least 8 characters.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-pass">Confirm Password *</Label>
                  <Input id="confirm-pass" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={changePassword} className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                    Update Password
                  </Button>
                  <Button variant="outline" onClick={() => setIsChangingPassword(false)}>Cancel</Button>
                </div>
              </div>
            ) : isEditing ? (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input id="name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="locations">Locations (comma-separated)</Label>
                  <Input id="locations" value={editLocations} onChange={(e) => setEditLocations(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveProfile} className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xl font-semibold text-gray-900 dark:text-white">{user.name || 'User'}</div>
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{user.username}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <span>Role:</span> {roleBadge(user.role)}
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-gray-400" />
                  <span>Status:</span> {statusBadge(user.status)}
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Locations: {user.locations?.length ? user.locations.join(', ') : 'None'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Member since: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
