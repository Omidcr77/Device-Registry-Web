import { Request, Response } from 'express';
import { connectMongo, MaintenanceWindowModel } from '../db/mongo.js';

export async function list(_req: Request, res: Response) {
  await connectMongo();
  const items = await MaintenanceWindowModel.find({}).sort({ startsAt: -1 }).lean();
  res.json(items);
}

export async function create(req: Request, res: Response) {
  const { deviceId, location, reason, startsAt, endsAt } = req.body || {};
  if (!startsAt || !endsAt) return res.status(400).json({ error: 'startsAt and endsAt required' });
  await connectMongo();
  const item = await MaintenanceWindowModel.create({
    deviceId: deviceId || null,
    location: location || null,
    reason: reason || null,
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
  });
  res.status(201).json(item);
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params;
  await connectMongo();
  await MaintenanceWindowModel.findByIdAndDelete(id);
  res.status(204).send();
}
