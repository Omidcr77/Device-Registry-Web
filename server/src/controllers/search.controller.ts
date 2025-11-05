import { Request, Response } from 'express';
import { connectMongo, DeviceModel, UserModel } from '../db/mongo.js';

export async function globalSearch(req: Request, res: Response) {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ devices: [], users: [] });
  await connectMongo();
  const regex = new RegExp(q, 'i');
  const [devices, users] = await Promise.all([
    DeviceModel.find({ $or: [
      { name: regex }, { customer: regex }, { location: regex }, { ip: regex }, { code: regex },
    ] }, { name: 1, ip: 1, location: 1, code: 1 }).limit(10).lean(),
    UserModel.find({ $or: [ { username: regex }, { role: regex }, { locations: regex } ] }, { username: 1, role: 1 }).limit(10).lean(),
  ]);
  res.json({ devices: devices.map(d => ({ ...d, id: String(d._id) })), users: users.map(u => ({ ...u, id: String(u._id) })) });
}
