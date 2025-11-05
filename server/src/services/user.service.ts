import bcrypt from 'bcrypt';
import { connectMongo, UserModel } from '../db/mongo.js';

export async function listUsers() {
  await connectMongo();
  const users: any[] = await UserModel.find({}, { username: 1, email: 1, role: 1, locations: 1, status: 1, settings: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
  return users.map(u => ({
    id: String(u._id),
    username: u.username,
    role: String(u.role || '').toLowerCase(),
    locations: Array.isArray(u.locations) ? u.locations : [],
    status: String(u.status || '').toLowerCase(),
    settings: u.settings || {},
    createdAt: u.createdAt,
  }));
}

export async function createUser(data: { username: string; password: string; role: string; locations: string[]; settings?: any }) {
  const hashedPassword = await bcrypt.hash(data.password, 10);
  await connectMongo();
  const user: any = await UserModel.create({
    username: data.username,
    password: hashedPassword,
    role: data.role.toUpperCase(),
    locations: data.locations || [],
    settings: data.settings || {},
    status: 'ACTIVE',
  });
  return {
    id: String(user._id),
    username: user.username,
    role: String(user.role || '').toLowerCase(),
    locations: user.locations || [],
    status: String(user.status || '').toLowerCase(),
    settings: user.settings || {},
    createdAt: user.createdAt,
  };
}

export async function updateUser(id: string, data: { username?: string; role?: string; locations?: string[]; status?: string; settings?: any; name?: string }) {
  await connectMongo();
  const updateData: any = {};
  if (data.username) updateData.username = data.username;
  if (data.role) updateData.role = data.role.toUpperCase();
  if (data.locations) updateData.locations = data.locations;
  if (data.status) updateData.status = data.status.toUpperCase();
  if (data.settings) updateData.settings = data.settings;
  if (typeof data.name === 'string') updateData.name = data.name;
  const user: any = await UserModel.findByIdAndUpdate(id, updateData, { new: true }).lean();
  if (!user) throw Object.assign(new Error('User not found'), { code: 'P2025' });
  return {
    id: String(user._id),
    username: user.username,
    role: String(user.role || '').toLowerCase(),
    locations: user.locations || [],
    status: String(user.status || '').toLowerCase(),
    settings: user.settings || {},
    createdAt: user.createdAt,
  };
}

export async function changePasswordUser(id: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await connectMongo();
  await UserModel.findByIdAndUpdate(id, { password: hashedPassword });
}

export async function deleteUser(id: string) {
  await connectMongo();
  await UserModel.findByIdAndDelete(id);
}
