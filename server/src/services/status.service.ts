import { pingIp } from './device.service.js';
import { connectMongo, DeviceStatusModel, MaintenanceWindowModel } from '../db/mongo.js';

let wsServerRef: any = null;
export function setWsServer(s: any) { wsServerRef = s; }
export function broadcastStatus(payload: any) {
  try {
    if (!wsServerRef?.clients) return;
    const msg = JSON.stringify(payload);
    wsServerRef.clients.forEach((client: any) => { try { if (client.readyState === 1) client.send(msg); } catch {} });
  } catch {}
}

// Generic alias for non-status events
export const broadcastEvent = broadcastStatus;

export async function isInMaintenance(deviceId: string, location?: string | null) {
  await connectMongo();
  const now = new Date();
  const windows = await MaintenanceWindowModel.find({
    startsAt: { $lte: now },
    endsAt: { $gte: now },
    $or: [
      { deviceId },
      { deviceId: null, location: location ?? undefined },
    ],
  }).lean();
  return windows.length > 0;
}

export async function updateDeviceStatus(device: { id: string; ip: string; location: string }) {
  const result = await pingIp(device.ip, 1000);
  const reachable = !!result.reachable;
  const latencyMs = result.timeMs ? Math.round(result.timeMs) : null;
  const now = new Date();

  await connectMongo();
  const prev: any = await DeviceStatusModel.findOne({ deviceId: device.id }).lean();
  const checks = (prev?.checks ?? 0) + 1;
  const failures = (prev?.failures ?? 0) + (reachable ? 0 : 1);
  const uptimePct = checks > 0 ? Math.max(0, Math.min(100, ((checks - failures) / checks) * 100)) : 0;

  // flapping detection window: rough heuristic using transitions counter in last 5 minutes
  let transitions5m = prev?.transitions5m ?? 0;
  let lastChangeAt = prev?.lastChangeAt ?? null;
  const prevReachable = prev?.reachable ?? null;
  if (prevReachable !== null && prevReachable !== reachable) {
    // if last change older than 5m, reset counter
    if (!lastChangeAt || now.getTime() - new Date(lastChangeAt).getTime() > 5 * 60 * 1000) {
      transitions5m = 1;
    } else {
      transitions5m = (transitions5m ?? 0) + 1;
    }
    lastChangeAt = now;
  } else if (lastChangeAt && now.getTime() - new Date(lastChangeAt).getTime() > 5 * 60 * 1000) {
    transitions5m = 0;
  }

  const data: any = {
    reachable,
    lastSeen: reachable ? now : prev?.lastSeen ?? null,
    latencyMs,
    uptimePct,
    checks,
    failures,
    lastChangeAt,
    transitions5m,
    updatedAt: now as any,
  };

  await DeviceStatusModel.updateOne({ deviceId: device.id }, { $set: data }, { upsert: true });

  // Return lastChangeAt and updatedAt to help clients decide if a change is recent
  return { reachable, latencyMs, uptimePct, transitions5m, lastChangeAt, updatedAt: now as any };
}

export async function getDeviceStatus(deviceId: string) {
  await connectMongo();
  return DeviceStatusModel.findOne({ deviceId }).lean();
}
