import { Request, Response } from 'express';
import { getDeviceStatus, broadcastStatus } from '../services/status.service.js';
import { connectMongo, DeviceStatusModel } from '../db/mongo.js';

export async function getStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const status = await getDeviceStatus(id);
    if (!status) return res.status(404).json({ error: 'No status' });
    res.json(status);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get status' });
  }
}

export async function setMockStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reachable = false, latencyMs = null } = req.body || {};
    await connectMongo();
    const now = new Date();
    await DeviceStatusModel.updateOne({ deviceId: id }, { $set: {
      reachable: !!reachable,
      lastSeen: reachable ? now : null,
      latencyMs: latencyMs == null ? null : Math.round(Number(latencyMs)),
      updatedAt: now,
    } }, { upsert: true });
    broadcastStatus({ type: 'device-status', deviceId: id, reachable: !!reachable, latencyMs, uptimePct: null, suppressed: false });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to set mock status' });
  }
}
