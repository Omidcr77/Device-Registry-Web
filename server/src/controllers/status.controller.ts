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

export async function getSummary(req: Request, res: Response) {
  try {
    await connectMongo();
    const idsParam = String((req.query.ids ?? '') || '').trim();
    const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : null;
    const match: any = ids && ids.length ? { deviceId: { $in: ids } } : {};

    const pipeline: any[] = [
      { $match: match },
      { $group: { _id: '$reachable', count: { $sum: 1 } } },
    ];
    const rows: Array<{ _id: any; count: number }> = await DeviceStatusModel.aggregate(pipeline).exec();
    let online = 0, offline = 0, known = 0;
    for (const r of rows) {
      if (r._id === true) online += r.count;
      else if (r._id === false) offline += r.count;
      known += r.count;
    }
    let total: number;
    if (ids && ids.length) {
      total = ids.length;
    } else {
      // If no filter, estimate total devices from statuses count; fallback to known
      total = known;
    }
    const unknown = Math.max(0, total - known);
    res.json({ total, online, offline, unknown });
  } catch (e) {
    res.status(500).json({ error: 'Failed to get summary' });
  }
}
