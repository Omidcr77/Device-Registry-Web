import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ArrowUpDown, Edit, Trash2, Filter, Download, Copy, Search, X } from 'lucide-react';
import type { Device as MockDevice } from '../lib/mockData';
import * as api from '../lib/api';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from './ui/table';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from './ui/dialog';

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from './ui/alert-dialog';

import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from './ui/pagination';

type Device = Omit<MockDevice, 'status'> & { status?: string; createdAt?: string; createdByName?: string };

interface DeviceListProps {
  devices: Device[];
  searchQuery: string;
  onSearchChange?: (query: string) => void;
  onDevicesChange?: () => void;
  loading?: boolean;
  canManageDevices?: boolean;
  onDeviceOffline?: (d: { id: string; name: string; ip?: string }) => void;
  pollIntervalMs?: number;
  stickyOffsetPx?: number;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  searchQuery,
  onSearchChange,
  onDevicesChange,
  loading = false,
  canManageDevices = true,
  onDeviceOffline,
  pollIntervalMs = 60000,
  stickyOffsetPx = 64,
}) => {
  const [sortField, setSortField] = useState<keyof Device>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('deviceList.columns') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem('deviceList.columns', JSON.stringify(visibleColumns)); } catch {}
  }, [visibleColumns]);
  const isColVisible = (key: string) => (visibleColumns.length === 0 || visibleColumns.includes(key));

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean | null>>({});
  const notifiedOfflineRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef<boolean>(false);
  const devicesRef = useRef<Device[]>(devices);
  useEffect(() => { devicesRef.current = devices; }, [devices]);
  // Suppress transition notifications shortly after mount or tab becomes visible
  const suppressUntilRef = useRef<number>(Date.now() + 5000);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        suppressUntilRef.current = Date.now() + 10000;
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const [editing, setEditing] = useState<{ id: string; field: 'name' | 'location'; value: string } | null>(null);

  // Add form
  const [newDeviceCode, setNewDeviceCode] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newIp, setNewIp] = useState('');

  // Edit form
  const [editDeviceCode, setEditDeviceCode] = useState('');
  const [editDeviceType, setEditDeviceType] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editCustomer, setEditCustomer] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editIp, setEditIp] = useState('');
  // removed status field in edit form

  const handleSort = (field: keyof Device) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredAndSortedDevices = useMemo(() => {
    let list = [...devices];

    // Local text search (fallback/plus server search)
    if (normalizedSearch) {
      list = list.filter((d) =>
        [d.code, d.type, d.name, d.customer, d.location, d.ip]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      );
    }

    if (typeFilter !== 'all') list = list.filter((d) => d.type === typeFilter);

    // Sort (string-aware + date)
    list.sort((a: any, b: any) => {
      const dir = sortDirection === 'asc' ? 1 : -1;
      const av = a[sortField];
      const bv = b[sortField];

      if (sortField === 'installDate' || sortField === 'createdAt') {
        const ad = new Date(av).getTime() || 0;
        const bd = new Date(bv).getTime() || 0;
        return (ad - bd) * dir;
      }

      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;

      return String(av).localeCompare(String(bv)) * dir;
    });

    return list;
  }, [devices, normalizedSearch, typeFilter, sortField, sortDirection]);

  // Saved views via URL params (df_*)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tf = params.get('df_type');
      const sf = params.get('df_status');
      const ps = params.get('df_ps');
      const srt = params.get('df_sort');
      const dir = params.get('df_dir') as 'asc' | 'desc' | null;
      if (tf) setTypeFilter(tf);
      if (sf === 'online' || sf === 'offline' || sf === 'all') setStatusFilter(sf);
      if (ps && !Number.isNaN(Number(ps))) setPageSize(Number(ps));
      if (srt && (['code','type','name','customer','location','installDate','ip'] as any).includes(srt)) setSortField(srt as any);
      if (dir === 'asc' || dir === 'desc') setSortDirection(dir);
    } catch {}
    // one-time on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('df_type', typeFilter);
      url.searchParams.set('df_status', statusFilter);
      url.searchParams.set('df_ps', String(pageSize));
      url.searchParams.set('df_sort', String(sortField));
      url.searchParams.set('df_dir', String(sortDirection));
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, [typeFilter, statusFilter, pageSize, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedDevices.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const start = (page - 1) * pageSize;
  let paginatedDevices = filteredAndSortedDevices.slice(start, start + pageSize);
  if (statusFilter !== 'all') {
    paginatedDevices = paginatedDevices.filter((d) => onlineMap[d.id] === (statusFilter === 'online'));
  }

  const checkOnlineFor = async (list: Device[]) => {
    const updates: Record<string, boolean | null> = {};
    await Promise.all(
      list.map(async (d) => {
        try {
          if (!d.ip || d.ip.toLowerCase() === 'n/a') {
            updates[d.id] = null;
            return;
          }
          const res = await api.pingIp(d.ip);
          updates[d.id] = !!res?.reachable;
        } catch (e) {
          updates[d.id] = false;
        }
      })
    );
    // First load: seed state but do not notify
    if (!initializedRef.current) {
      initializedRef.current = true;
      setOnlineMap((prev) => ({ ...prev, ...updates }));
      return;
    }

    // Notify only on transitions online -> offline
    if (onDeviceOffline) {
      list.forEach((d) => {
        const prevState = onlineMap[d.id];
        const newState = updates[d.id];
        // Transition from explicitly online to offline triggers notification
        const canNotifyNow = document.visibilityState === 'visible' && Date.now() >= suppressUntilRef.current;
        if (prevState === true && newState === false && !notifiedOfflineRef.current.has(d.id)) {
          if (canNotifyNow) {
            onDeviceOffline({ id: d.id, name: d.name, ip: d.ip });
            notifiedOfflineRef.current.add(d.id);
          }
        }
        // Clear flag when back online
        if (newState === true) {
          notifiedOfflineRef.current.delete(d.id);
        }
      });
    }
    setOnlineMap((prev) => ({ ...prev, ...updates }));
  };

  // Auto-check online status for the current page
  useEffect(() => {
    if (paginatedDevices.length) {
      checkOnlineFor(paginatedDevices);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, pageSize, filteredAndSortedDevices]);

  // Periodic polling to detect offline transitions
  useEffect(() => {
    if (!paginatedDevices.length) return;
    const id = setInterval(() => {
      checkOnlineFor(paginatedDevices);
    }, Math.max(5000, pollIntervalMs || 60000));
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedDevices.map((d) => d.id).join(','), pageSize, pollIntervalMs]);

  // WS handled at Dashboard level for global alerts; here we rely on polling + props

  const handleInlineEdit = (id: string, field: 'name' | 'location', current: string) => {
    setEditing({ id, field, value: current });
  };

  const renderEditableCell = (id: string, field: 'name' | 'location', value: string) => {
    if (editing && editing.id === id && editing.field === field) {
      return (
        <input
          className="bg-transparent border border-gray-300 dark:border-gray-700 rounded px-2 py-1 w-full"
          value={editing.value}
          autoFocus
          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
          onBlur={async () => {
            const newVal = editing.value.trim();
            setEditing(null);
            if (newVal !== value) {
              try {
                // optimistic update
                const original = devices.slice();
                const idx = devices.findIndex((d) => d.id === id);
                if (idx >= 0) {
                  // @ts-ignore
                  original[idx] = { ...original[idx], [field]: newVal };
                }
                await api.updateDevice(id, { [field]: newVal } as any);
                toast.success('Updated');
                onDevicesChange?.();
              } catch {
                toast.error('Failed to update');
              }
            }
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditing(null); }}
        />
      );
    }
    return (
      <span onDoubleClick={() => handleInlineEdit(id, field, value)} title="Double-click to edit" className="cursor-text">
        {value}
      </span>
    );
  };

  const onlineCount = paginatedDevices.filter((d) => onlineMap[d.id] === true).length;
  const offlineCount = paginatedDevices.filter((d) => onlineMap[d.id] === false).length;


  const copyIp = async (ip: string) => {
    try {
      await navigator.clipboard.writeText(ip);
      toast.success('IP copied');
    } catch (e) {
      toast.error('Could not copy IP');
    }
  };

  const handleAddDevice = () => setIsAddDialogOpen(true);

  const handleSubmitAddDevice = async () => {
    if (!newDeviceCode || !newDeviceType || !newDeviceName || !newCustomer || !newLocation || !newIp) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const newDevice = {
        code: newDeviceCode,
        type: newDeviceType,
        name: newDeviceName,
        customer: newCustomer,
        location: newLocation,
        installDate: new Date().toISOString(), // store ISO
        ip: newIp,
      };
      await api.createDevice(newDevice);
      toast.success('Device added');
      setIsAddDialogOpen(false);
      setNewDeviceCode('');
      setNewDeviceType('');
      setNewDeviceName('');
      setNewCustomer('');
      setNewLocation('');
      setNewIp('');
      onDevicesChange?.();
    } catch (e) {
      toast.error('Failed to add device');
    }
  };

  const handleSubmitEditDevice = async () => {
    if (!editingDevice) return;
    if (!editDeviceCode || !editDeviceType || !editDeviceName || !editCustomer || !editLocation || !editIp) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await api.updateDevice(editingDevice.id, {
        code: editDeviceCode,
        type: editDeviceType,
        name: editDeviceName,
        customer: editCustomer,
        location: editLocation,
        ip: editIp,
      });
      toast.success('Device updated');
      setIsEditDialogOpen(false);
      setEditingDevice(null);
      onDevicesChange?.();
    } catch (e) {
      toast.error('Failed to update device');
    }
  };

  const handleDeleteDevice = (device: Device) => {
    setDeletingDevice(device);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteDevice = async () => {
    if (!deletingDevice) return;
    try {
      await api.deleteDevice(deletingDevice.id);
      toast.success(`Deleted ${deletingDevice.name}`);
      setIsDeleteDialogOpen(false);
      setDeletingDevice(null);
      onDevicesChange?.();
    } catch (e) {
      toast.error('Failed to delete device');
    }
  };

  const handleEditDevice = (d: Device) => {
    setEditingDevice(d);
    setEditDeviceCode(d.code);
    setEditDeviceType(d.type);
    setEditDeviceName(d.name);
    setEditCustomer(d.customer);
    setEditLocation(d.location);
    setEditIp(d.ip);
    setIsEditDialogOpen(true);
  };

  const exportDevices = () => {
    const csv = [
      ['Code', 'Type', 'Name', 'Customer', 'Location', 'Install Date', 'IP', 'Created', 'Created By'],
      ...filteredAndSortedDevices.map((d) => [
        d.code, d.type, d.name, d.customer, d.location,
        d.installDate, d.ip,
        d.createdAt ? new Date(d.createdAt).toISOString() : '',
        d.createdByName || '',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'devices.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported devices');
  };

  return (
    <div className="space-y-6">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sticky z-30 bg-white/70 dark:bg-slate-900/70 backdrop-blur border-b border-gray-200 dark:border-gray-800 p-3 rounded-xl shadow-sm" style={{ top: (stickyOffsetPx || 64) + 8 }}>
        {/* Search at top of table */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="search"
            placeholder="Search devices, customers, locations…"
            className="pl-10 bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-gray-700 rounded-xl"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            aria-label="Search devices, customers, locations"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
              aria-label="Clear search"
              title="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={typeFilter} onValueChange={(v: React.SetStateAction<string>) => { setTypeFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Device Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Router">Router</SelectItem>
                  <SelectItem value="Switch">Switch</SelectItem>
                  <SelectItem value="SXT">SXT</SelectItem>
                  <SelectItem value="LHG">LHG</SelectItem>
                  {/* Cable removed */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={String(pageSize)} onValueChange={(v: any) => { setPageSize(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Rows/page" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 / page</SelectItem>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => checkOnlineFor(paginatedDevices)}>
              Check Online (page)
            </Button>
            <Button variant="ghost" className="gap-2" onClick={exportDevices}>
              <Download className="w-4 h-4" />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Visible Columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {['code','type','name','customer','location','installDate','ip','createdAt','createdByName','online'].map((k) => (
                  <DropdownMenuCheckboxItem key={k}
                    checked={isColVisible(k)}
                    onCheckedChange={(checked: boolean) => {
                      setVisibleColumns((prev) => {
                        if (prev.length === 0 && checked) return prev;
                        const set = new Set(prev);
                        if (checked) set.add(k); else set.delete(k);
                        return Array.from(set);
                      });
                    }}
                  >{k === 'installDate' ? 'Install Date' : k === 'createdAt' ? 'Created' : k === 'createdByName' ? 'Created By' : k.charAt(0).toUpperCase() + k.slice(1)}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-2 hidden sm:flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Online {onlineCount}</span>
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Offline {offlineCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table / Empty / Loading */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Loading devices…</div>
        ) : filteredAndSortedDevices.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-gray-900 dark:text-white font-medium mb-1">No devices found</div>
            <div className="text-gray-500 dark:text-gray-400 mb-4">
              Try adjusting filters or add a new device.
            </div>
            {canManageDevices && (
              <Button onClick={handleAddDevice}>
              <Plus className="w-4 h-4 mr-2" /> Add Device
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop/tablet table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-slate-800/50">
                    {([
                      ['code', 'Code'],
                      ['type', 'Type'],
                      ['name', 'Name'],
                      ['customer', 'Customer'],
                      ['location', 'Location'],
                      ['installDate', 'Install Date'],
                      ['ip', 'IP'],
                      ['createdAt', 'Created'],
                      ['createdByName', 'Created By'],
                    ] as [keyof Device, string][]).filter(([key]) => isColVisible(String(key))).map(([key, label]) => (
                      <TableHead
                        key={key}
                        onClick={() => handleSort(key)}
                        className="cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          {label}
                          <ArrowUpDown className="w-4 h-4" />
                        </div>
                      </TableHead>
                    ))}
                    {isColVisible('online') && <TableHead>Online</TableHead>}
                    {/* Status column removed */}
                    {canManageDevices && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedDevices.map((d) => (
                    <TableRow key={d.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell style={{display: isColVisible('code') ? undefined : 'none'}}>{d.code}</TableCell>
                      <TableCell style={{display: isColVisible('type') ? undefined : 'none'}}>{d.type}</TableCell>
                      <TableCell style={{display: isColVisible('name') ? undefined : 'none'}}>{renderEditableCell(d.id, 'name', d.name)}</TableCell>
                      <TableCell style={{display: isColVisible('customer') ? undefined : 'none'}}>{d.customer}</TableCell>
                      <TableCell className="text-gray-600 dark:text-gray-400" style={{display: isColVisible('location') ? undefined : 'none'}}>{renderEditableCell(d.id, 'location', d.location)}</TableCell>
                      <TableCell style={{display: isColVisible('installDate') ? undefined : 'none'}}>
                        {d.installDate ? new Date(d.installDate).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="font-mono flex items-center gap-2" style={{display: isColVisible('ip') ? undefined : 'none'}}>
                        {d.ip}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyIp(d.ip)} aria-label="Copy IP">
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell style={{display: isColVisible('createdAt') ? undefined : 'none'}}>
                        {d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell style={{display: isColVisible('createdByName') ? undefined : 'none'}}>
                        {d.createdByName || '—'}
                      </TableCell>
                      <TableCell style={{display: isColVisible('online') ? undefined : 'none'}}>
                        {onlineMap[d.id] === true ? (
                          <span className="inline-flex items-center gap-2 text-blue-600"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Online</span>
                        ) : onlineMap[d.id] === false ? (
                          <span className="inline-flex items-center gap-2 text-red-600"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Offline</span>
                        ) : onlineMap[d.id] === null ? (
                          <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400"><span className="h-2.5 w-2.5 rounded-full bg-gray-300" /> N/A</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      {/* Status cell removed */}
                      {canManageDevices && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleEditDevice(d)}
                              className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400"
                              aria-label="Edit device"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleDeleteDevice(d)}
                              className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                              aria-label="Delete device"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-gray-200 dark:border-gray-800 p-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                            onClick={() => setCurrentPage(Math.max(1, page - 1))}
                            className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} size={undefined}                      />
                    </PaginationItem>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink onClick={() => setCurrentPage(p)} isActive={page === p} className="cursor-pointer" size={undefined}>
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    {totalPages > 5 && <PaginationEllipsis />}

                    <PaginationItem>
                      <PaginationNext
                            onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
                            className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} size={undefined}                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Add */}
      {canManageDevices && (
        <Button
          onClick={handleAddDevice}
          className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/30 hover:shadow-xl transition-all"
          aria-label="Add device"
        >
          <Plus className="w-6 h-6" />
        </Button>
      )}

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent  className="w-[520px] md:w-[720px] lg:w-[800px] max-w-[96vw] max-h-[88vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Add New Device</DialogTitle>
            <DialogDescription>Enter details to add this device to the registry. Press Esc to close.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="device-code">Device Code *</Label>
              <Input id="device-code" value={newDeviceCode} onChange={(e) => setNewDeviceCode(e.target.value)} placeholder="e.g., D001" />
            </div>
            <div className="grid gap-2">
              <Label>Device Type *</Label>
              <Select value={newDeviceType} onValueChange={setNewDeviceType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Router">Router</SelectItem>
                  <SelectItem value="Switch">Switch</SelectItem>
                  <SelectItem value="SXT">SXT</SelectItem>
                  <SelectItem value="LHG">LHG</SelectItem>
                  {/* Cable removed */}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="device-name">Device Name *</Label>
              <Input id="device-name" value={newDeviceName} onChange={(e) => setNewDeviceName(e.target.value)} placeholder="e.g., RT-Main-01" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="customer">Customer *</Label>
              <Input id="customer" value={newCustomer} onChange={(e) => setNewCustomer(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location *</Label>
              <Input id="location" value={newLocation} onChange={(e) => setNewLocation(e.target.value)} placeholder="Building, Floor, Rack" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ip">IP Address *</Label>
              <Input id="ip" value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="192.168.1.x" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitAddDevice} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              Add Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[520px] md:w-[720px] lg:w-[800px] max-w-[96vw] max-h-[88vh] overflow-y-auto rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>Update device details. Press Esc to close.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-device-code">Device Code *</Label>
              <Input id="edit-device-code" value={editDeviceCode} onChange={(e) => setEditDeviceCode(e.target.value)} placeholder="e.g., D001" />
            </div>
            <div className="grid gap-2">
              <Label>Device Type *</Label>
              <Select value={editDeviceType} onValueChange={setEditDeviceType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Router">Router</SelectItem>
                  <SelectItem value="Switch">Switch</SelectItem>
                  <SelectItem value="SXT">SXT</SelectItem>
                  <SelectItem value="LHG">LHG</SelectItem>
                  {/* Cable removed */}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-device-name">Device Name *</Label>
              <Input id="edit-device-name" value={editDeviceName} onChange={(e) => setEditDeviceName(e.target.value)} placeholder="e.g., RT-Main-01" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-customer">Customer *</Label>
              <Input id="edit-customer" value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)} placeholder="Customer name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-location">Location *</Label>
              <Input id="edit-location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Building, Floor, Rack" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-ip">IP Address *</Label>
              <Input id="edit-ip" value={editIp} onChange={(e) => setEditIp(e.target.value)} placeholder="192.168.1.x" />
            </div>
            {/* status field removed */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitEditDevice} className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
              Update Device
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white dark:bg-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete device?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. It will permanently remove <span className="font-semibold">{deletingDevice?.name}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteDevice} className="bg-red-600 hover:bg-red-700 text-white">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
