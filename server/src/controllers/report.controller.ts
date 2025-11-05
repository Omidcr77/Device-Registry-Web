import { Request, Response } from 'express';
import { DeviceModel, DeviceStatusModel, MaintenanceWindowModel, UserModel, connectMongo } from '../db/mongo.js';

type Format = 'csv' | 'json';

const REPORTS = [
  { id: 'device-inventory', name: 'Device Inventory Report', type: 'device', description: 'Complete list of all devices with status and details' },
  { id: 'user-activity', name: 'User Activity Report', type: 'user', description: 'User accounts and metadata' },
  { id: 'maintenance-schedule', name: 'Maintenance Schedule', type: 'maintenance', description: 'Upcoming and completed maintenance activities' },
  { id: 'system-health', name: 'System Health Report', type: 'activity', description: 'Aggregated device health metrics' },
];

function toCsv(rows: any[]): string {
  if (!rows || !rows.length) return '';
  const headersSet = new Set<string>();
  for (const row of rows) {
    Object.keys(row as any).forEach((k) => headersSet.add(k));
  }
  const headers: string[] = Array.from(headersSet);
  const esc = (v: any) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => esc((r as any)[h])).join(','));
  return lines.join('\n');
}

export async function listReports(req: Request, res: Response) {
  res.json(REPORTS.map((r) => ({ ...r, status: 'available' })));
}

export async function exportReport(req: Request, res: Response) {
  await connectMongo();
  const reportId = String(req.query.reportId || req.params.reportId || '');
  const fmt: Format = (String(req.query.format || 'csv').toLowerCase() as Format) || 'csv';
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  let filename = reportId || 'report';
  let rows: any[] = [];

  if (reportId === 'device-inventory') {
    const q: any = {};
    if (from) q.installDate = { ...(q.installDate || {}), $gte: from };
    if (to) q.installDate = { ...(q.installDate || {}), $lte: to };
    const items = await DeviceModel.find(q).sort({ code: 1 }).lean();
    rows = items.map((d: any) => ({
      code: d.code,
      type: d.type,
      name: d.name,
      customer: d.customer,
      location: d.location,
      installDate: d.installDate ? new Date(d.installDate).toISOString() : '',
      ip: d.ip,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : '',
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : '',
    }));
  } else if (reportId === 'user-activity') {
    const q: any = {};
    if (from) q.createdAt = { ...(q.createdAt || {}), $gte: from };
    if (to) q.createdAt = { ...(q.createdAt || {}), $lte: to };
    const items = await UserModel.find(q, { email: 1, role: 1, status: 1, locations: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
    rows = items.map((u: any) => ({
      email: u.email,
      role: u.role,
      status: u.status,
      locations: Array.isArray(u.locations) ? u.locations.join('; ') : '',
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : '',
    }));
  } else if (reportId === 'maintenance-schedule') {
    const q: any = {};
    if (from) q.startsAt = { ...(q.startsAt || {}), $gte: from };
    if (to) q.endsAt = { ...(q.endsAt || {}), $lte: to };
    const items = await MaintenanceWindowModel.find(q).sort({ startsAt: -1 }).lean();
    // fetch device names for nicer output
    const deviceIds = Array.from(new Set(items.map((m: any) => m.deviceId).filter(Boolean)));
    const devices = await DeviceModel.find({ _id: { $in: deviceIds } }, { name: 1 }).lean();
    const nameById = new Map<string, string>();
    devices.forEach((d: any) => nameById.set(String(d._id), d.name));
    rows = items.map((m: any) => ({
      deviceId: m.deviceId,
      deviceName: m.deviceId ? nameById.get(String(m.deviceId)) || '' : '',
      location: m.location,
      reason: m.reason,
      startsAt: m.startsAt ? new Date(m.startsAt).toISOString() : '',
      endsAt: m.endsAt ? new Date(m.endsAt).toISOString() : '',
      createdById: m.createdById || '',
      createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : '',
    }));
  } else if (reportId === 'system-health') {
    const q: any = {};
    if (from) q.updatedAt = { ...(q.updatedAt || {}), $gte: from };
    if (to) q.updatedAt = { ...(q.updatedAt || {}), $lte: to };
    const items = await DeviceStatusModel.find(q).sort({ updatedAt: -1 }).lean();
    const deviceIds = Array.from(new Set(items.map((s: any) => s.deviceId).filter(Boolean)));
    const devices = await DeviceModel.find({ _id: { $in: deviceIds } }, { name: 1 }).lean();
    const nameById = new Map<string, string>();
    devices.forEach((d: any) => nameById.set(String(d._id), d.name));
    rows = items.map((s: any) => ({
      deviceId: s.deviceId,
      deviceName: s.deviceId ? nameById.get(String(s.deviceId)) || '' : '',
      reachable: s.reachable,
      lastSeen: s.lastSeen ? new Date(s.lastSeen).toISOString() : '',
      latencyMs: s.latencyMs ?? '',
      uptimePct: s.uptimePct ?? '',
      transitions5m: s.transitions5m ?? '',
      updatedAt: s.updatedAt ? new Date(s.updatedAt).toISOString() : '',
    }));
  } else {
    return res.status(400).json({ message: 'Unknown reportId' });
  }

  if (fmt === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    return res.status(200).send(JSON.stringify(rows));
  }

  const csv = toCsv(rows);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
  return res.status(200).send(csv);
}
