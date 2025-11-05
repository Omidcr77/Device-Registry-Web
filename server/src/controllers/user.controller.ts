import { Request, Response } from 'express';
import { listUsers, createUser, updateUser, deleteUser, changePasswordUser } from '../services/user.service.js';
import { connectMongo, UserModel } from '../db/mongo.js';

export async function list(req: Request, res: Response) {
  const data = await listUsers();
  res.json(data);
}

export async function create(req: Request, res: Response) {
  try {
    const { username, password, role, locations } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }
    const user = await createUser({ username, password, role, locations: locations || [] });
    res.status(201).json(user);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
}

export async function update(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { username, role, locations, status, settings, name } = req.body || {};
    // @ts-ignore
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Allow self-update for limited fields
    if (currentUser.id === id) {
      const payload: any = {};
      if (typeof username === 'string' && username.trim()) payload.username = username.trim();
      if (Array.isArray(locations)) payload.locations = locations;
      if (typeof name === 'string') payload.name = name;
      const user = await updateUser(id, payload);
      return res.json(user);
    }

    // Otherwise require admin to update others
    if (String(currentUser.role || '').toUpperCase() !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const user = await updateUser(id, { username, role, locations, status, settings, name });
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
}

export async function getSettings(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    await connectMongo();
    const user: any = await UserModel.findById(userId, { settings: 1 }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.settings || {});
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
}

export async function updateSettings(req: Request, res: Response) {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    const settings = req.body;
    const user = await updateUser(userId, { settings });
    res.json(user.settings);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
}

export async function changePassword(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // @ts-ignore
    const currentUser = req.user;
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

    // Allow if changing own password
    if (currentUser.id === id) {
      await changePasswordUser(id, newPassword);
      return res.json({ message: 'Password changed successfully' });
    }

    // Allow if admin changing non-admin's password
    if (currentUser.role === 'ADMIN') {
      await connectMongo();
      const targetUser: any = await UserModel.findById(id, { role: 1 }).lean();
      if (!targetUser) return res.status(404).json({ error: 'User not found' });
      if (targetUser.role === 'ADMIN') {
        return res.status(403).json({ error: 'Cannot change password of another admin' });
      }
      await changePasswordUser(id, newPassword);
      return res.json({ message: 'Password changed successfully' });
    }

    // Otherwise, forbid
    return res.status(403).json({ error: 'Forbidden' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
}

export async function remove(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await deleteUser(id);
    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }
}

function toCsv(rows: any[]): string {
  const cols = Object.keys(rows[0] || {});
  const esc = (v: any) => {
    const s = v == null ? '' : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const out = [cols.map(esc).join(',')];
  for (const r of rows) out.push(cols.map((c) => esc(r[c])).join(','));
  return out.join('\n');
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
  cur.push(field); rows.push(cur);
  const header = (rows.shift() || []).map(h => h.trim());
  return rows
    .filter(r => r.some(v => String(v).trim().length > 0))
    .map(r => {
      const obj: Record<string,string> = {};
      header.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

// GET /api/users/export?format=csv
export async function exportUsers(req: Request, res: Response) {
  try {
    await connectMongo();
    const users: any[] = await UserModel.find({}, { username: 1, role: 1, locations: 1, status: 1, name: 1, password: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
    const rows = users.map(u => ({
      username: u.username,
      role: String(u.role || ''),
      locations: JSON.stringify(Array.isArray(u.locations) ? u.locations : []),
      status: String(u.status || ''),
      name: u.name || '',
      password: String(u.password || ''), // hashed password for restore
      createdAt: u.createdAt?.toISOString?.() || '',
    }));
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.csv"');
    return res.status(200).send(csv);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to export users', message: e?.message });
  }
}

// POST /api/users/import  { csv: string }
export async function importUsers(req: Request, res: Response) {
  try {
    const csv: string = String((req.body && (req.body.csv ?? req.body)) || '').trim();
    if (!csv) return res.status(400).json({ error: 'Missing csv' });
    const rows = parseCsv(csv);
    await connectMongo();
    let created = 0, updated = 0, skipped = 0;
    for (const row of rows) {
      const username = (row.username || row.Username || '').trim();
      if (!username) { skipped++; continue; }
      const role = (row.role || row.Role || 'VIEWER').toUpperCase();
      const status = (row.status || row.Status || 'ACTIVE').toUpperCase();
      const name = (row.name || row.Name || '').trim();
      let locations: string[] = [];
      const locRaw = row.locations || row.Locations || '';
      if (locRaw) {
        try { const p = JSON.parse(locRaw); if (Array.isArray(p)) locations = p.map(String); } catch { locations = String(locRaw).split(';').map(s => s.trim()).filter(Boolean); }
      }
      const pwdHash = (row.password || row.Password || '').trim();
      const existing: any = await UserModel.findOne({ username }, { _id: 1 }).lean();
      if (existing) {
        const setData: any = { role, status, locations, name };
        // only update password if provided
        if (pwdHash) setData.password = pwdHash;
        await UserModel.updateOne({ _id: existing._id }, { $set: setData });
        updated++;
      } else {
        if (!pwdHash) { skipped++; continue; } // require password for create
        await UserModel.create({ username, role, status, locations, name, password: pwdHash });
        created++;
      }
    }
    return res.json({ created, updated, skipped, total: rows.length });
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to import users', message: e?.message });
  }
}
