import React, { useEffect, useState } from 'react';
import * as api from '../lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ open, onOpenChange }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any>({ devices: [], users: [] });

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(async () => {
      if (!q.trim()) { setResults({ devices: [], users: [] }); return; }
      try { const r = await api.globalSearch(q.trim()); setResults(r || { devices: [], users: [] }); } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [q, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input autoFocus placeholder="Search devices, users, locations" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-auto">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Devices</div>
              <ul className="space-y-2">
                {(results.devices || []).map((d: any) => (
                  <li key={d.id} className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{d.name}</span> <span className="text-gray-500 dark:text-gray-400">{d.ip}</span>
                  </li>
                ))}
                {(!results.devices || results.devices.length === 0) && <li className="text-xs text-gray-400">No devices</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Users</div>
              <ul className="space-y-2">
                {(results.users || []).map((u: any) => (
                  <li key={u.id} className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{u.username}</span> <span className="text-gray-500 dark:text-gray-400">{u.role?.toLowerCase?.()}</span>
                  </li>
                ))}
                {(!results.users || results.users.length === 0) && <li className="text-xs text-gray-400">No users</li>}
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
