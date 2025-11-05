import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { connectMongo, UserModel } from '../db/mongo.js';

function parseArray(str: unknown): string[] {
  if (Array.isArray(str)) return str as string[];
  if (typeof str !== 'string') return [];
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : []; } catch { return []; }
}
function parseObject(str: unknown): Record<string, any> {
  if (str && typeof str === 'object') return str as Record<string, any>;
  if (typeof str !== 'string') return {};
  try { const v = JSON.parse(str); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}

export async function login(username: string, password: string) {
  await connectMongo();
  // Allow login via username (primary). Fallback to email for compatibility.
  const user: any = await UserModel.findOne({ $or: [ { username }, { email: username } ] }).lean();
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const ok = await bcrypt.compare(password, user.password as string);
  if (!ok) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  // Block login if user is inactive
  const status = String(user.status || '').toUpperCase();
  if (status && status !== 'ACTIVE') {
    throw Object.assign(new Error('Account is inactive'), { status: 403 });
  }

  const token = jwt.sign({ id: String(user._id), role: user.role, username: user.username }, ENV.JWT_SECRET, { expiresIn: '7d' });
  return { token, user: serializeUser(user) };
}

export async function me(userId: string) {
  await connectMongo();
  const user: any = await UserModel.findById(userId).lean();
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
  return serializeUser(user);
}

function serializeUser(u: any) {
  const locations = Array.isArray(u.locations) ? u.locations : [];
  const settings  = (u.settings && typeof u.settings === 'object') ? u.settings : {};
  return {
    id: String(u._id ?? u.id),
    username: u.username,
    email: u.email,
    name: u.name ?? 'User',
    role: u.role,
    status: u.status,
    locations,
    settings,
    createdAt: u.createdAt || null,
  };
}
