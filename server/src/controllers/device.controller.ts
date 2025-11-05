import { Request, Response } from 'express';
import * as svc from '../services/device.service.js';
import { connectMongo, DeviceModel, UserModel } from '../db/mongo.js';

function parseLocations(str: unknown): string[] {
  if (Array.isArray(str)) return str as string[];
  if (typeof str !== 'string') return [];
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : []; } catch { return []; }
}

async function canManageLocation(req: Request, location?: string): Promise<boolean> {
  const role = req.user?.role;
  if (!role) return false;
  if (role === 'ADMIN') return true;
  if (role === 'MANAGER') {
    if (!location) return false;
    await connectMongo();
    const user: any = await UserModel.findById(req.user!.id, { locations: 1 }).lean();
    const locs = Array.isArray(user?.locations) ? user.locations : [];
    return locs.includes(location);
  }
  return false;
}

export async function list(req: Request, res: Response) {
  const data = await svc.listDevices(req.query);
  res.json(data);
}

export async function getOne(req: Request, res: Response) {
  const data = await svc.getDevice(req.params.id);
  res.json(data);
}

export async function create(req: Request, res: Response) {
  const userId = req.user?.id;
  const allowed = await canManageLocation(req, req.body?.location);
  if (!allowed) return res.status(403).json({ message: 'Forbidden: location not permitted' });
  const data = await svc.createDevice(req.body, userId);
  res.status(201).json(data);
}

export async function update(req: Request, res: Response) {
  await connectMongo();
  const device: any = await DeviceModel.findById(req.params.id, { location: 1 }).lean();
  if (!device) return res.status(404).json({ message: 'Device not found' });
  const targetLocation = req.body?.location || device.location;
  const allowed = await canManageLocation(req, targetLocation);
  if (!allowed) return res.status(403).json({ message: 'Forbidden: location not permitted' });
  const data = await svc.updateDevice(req.params.id, req.body);
  res.json(data);
}

export async function remove(req: Request, res: Response) {
  await connectMongo();
  const device: any = await DeviceModel.findById(req.params.id, { location: 1 }).lean();
  if (!device) return res.status(404).json({ message: 'Device not found' });
  const allowed = await canManageLocation(req, device.location);
  if (!allowed) return res.status(403).json({ message: 'Forbidden: location not permitted' });
  await svc.removeDevice(req.params.id);
  res.json({ success: true });
}

export async function ping(req: Request, res: Response) {
  const ip = String(req.query.ip || '').trim();
  if (!ip) return res.status(400).json({ message: 'Missing ip' });
  const result = await svc.pingIp(ip);
  res.json(result);
}

function parseCsv(text: string): Array<Record<string,string>> {
  const rows: Array<string[]> = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i+1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      } else { field += ch; i++; continue; }
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { cur.push(field); field = ''; i++; continue; }
      if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i+1] === '\n') i++;
        cur.push(field); field=''; rows.push(cur); cur=[]; i++; continue;
      }
      field += ch; i++; continue;
    }
  }
  // flush last
  cur.push(field);
  rows.push(cur);
  // header
  const header = (rows.shift() || []).map(h => h.trim());
  return rows
    .filter(r => r.some(v => String(v).trim().length > 0))
    .map(r => {
      const obj: Record<string,string> = {};
      header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

export async function importCsv(req: Request, res: Response) {
  try {
    const csv: string = String((req.body && (req.body.csv ?? req.body)) || '').trim();
    if (!csv) return res.status(400).json({ message: 'Missing csv' });
    const rows = parseCsv(csv);
    let created = 0, updated = 0, skipped = 0;
    await connectMongo();
    for (const row of rows) {
      const code = (row.code || row.Code || '').trim();
      if (!code) { skipped++; continue; }
      const doc: any = {
        code,
        type: row.type || row.Type || 'Unknown',
        name: row.name || row.Name || code,
        customer: row.customer || row.Customer || '',
        location: row.location || row.Location || '',
        ip: row.ip || row.IP || row.Ip || '',
      };
      const idate = row.installDate || row.InstallDate || row.install_date;
      if (idate) {
        const d = new Date(idate);
        if (!Number.isNaN(d.getTime())) doc.installDate = d;
      }
      const existing: any = await DeviceModel.findOne({ code }, { _id: 1 }).lean();
      if (existing) {
        await DeviceModel.updateOne({ _id: existing._id }, { $set: doc });
        updated++;
      } else {
        // Ensure required installDate
        if (!doc.installDate) doc.installDate = new Date();
        await DeviceModel.create(doc);
        created++;
      }
    }
    return res.json({ created, updated, skipped, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ message: 'Failed to import devices', error: e?.message });
  }
}
