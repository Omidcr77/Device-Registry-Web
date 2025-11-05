import { buildDeviceWhere, buildOrderBy } from '../utils/filters.js';
import { execFile } from 'child_process';
import { connectMongo, DeviceModel, UserModel } from '../db/mongo.js';

// Prisma removed in favor of MongoDB

// Notification helper function placeholder (implemented via WebSocket + client toasts)

export async function listDevices(query: any) {
  await connectMongo();
  const where = buildDeviceWhere(query);
  const orderBy = buildOrderBy(query.sort, query.dir);
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const pageSize = Math.min(Math.max(parseInt(query.pageSize || '10', 10), 1), 100);
  const skip = (page - 1) * pageSize;

  const [rawItems, total] = await Promise.all([
    DeviceModel.find(where).sort(orderBy).skip(skip).limit(pageSize).lean(),
    DeviceModel.countDocuments(where),
  ]);

  // Enrich with creator info (name/email)
  const creatorIds = Array.from(new Set(rawItems.map((d: any) => String(d.createdById || '')).filter(Boolean)));
  let creatorMap: Record<string, { name?: string; email?: string }> = {};
  if (creatorIds.length) {
    const users: any[] = await UserModel.find({ _id: { $in: creatorIds } }, { name: 1, email: 1 }).lean();
    for (const u of users) creatorMap[String(u._id)] = { name: u.name, email: u.email };
  }

  const items = rawItems.map((d: any) => {
    const id = String(d._id);
    const creator = d.createdById ? creatorMap[String(d.createdById)] : undefined;
    const createdByName = creator?.name || creator?.email || undefined;
    return { ...d, id, createdByName } as any;
  });
  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getDevice(id: string) {
  await connectMongo();
  const device: any = await DeviceModel.findById(id).lean();
  if (!device) throw Object.assign(new Error('Device not found'), { status: 404 });
  // Enrich with creator info
  let createdByName: string | undefined;
  if (device.createdById) {
    const u: any = await UserModel.findById(device.createdById, { name: 1, email: 1 }).lean();
    if (u) createdByName = u.name || u.email;
  }
  return { ...device, createdByName } as any;
}

export async function createDevice(data: any, userId?: string) {
  await connectMongo();
  // Generate sequential code if not provided
  let code = data.code;
  if (!code) {
    const lastDevice = await DeviceModel.findOne({}, null, { sort: { code: -1 } }).lean();
    let nextNumber = 1;
    if (lastDevice && (lastDevice as any).code) {
      const match = lastDevice.code.match(/^D(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    code = `D${nextNumber.toString().padStart(3, '0')}`;
  }

  const device = await DeviceModel.create({
    code,
    type: data.type,
    name: data.name,
    customer: data.customer,
    location: data.location,
    installDate: new Date(data.installDate),
    ip: data.ip,
    createdById: userId,
  });
  return device;
}

export async function updateDevice(id: string, data: any) {
  await connectMongo();
  const device = await DeviceModel.findByIdAndUpdate(id, {
    code: data.code,
    type: data.type,
    name: data.name,
    customer: data.customer,
    location: data.location,
    installDate: data.installDate ? new Date(data.installDate) : undefined,
    ip: data.ip,
  }, { new: true }).lean();

  // Status removed: skip status change notifications

  return device;
}

export async function removeDevice(id: string) {
  await connectMongo();
  await DeviceModel.findByIdAndDelete(id);
  return { success: true };
}

export function pingIp(ip: string, timeoutMs = 1000): Promise<{ ip: string; reachable: boolean; timeMs?: number }> {
  return new Promise((resolve) => {
    if (!ip || ip.toLowerCase() === 'n/a') return resolve({ ip, reachable: false });
    const isWin = process.platform === 'win32';
    const args = isWin
      ? ['-n', '1', '-w', String(timeoutMs), ip]
      : ['-c', '1', '-W', String(Math.max(1, Math.ceil(timeoutMs / 1000))), ip];

    const started = Date.now();
    const child = execFile('ping', args, { timeout: timeoutMs + 500 }, (err, stdout = '', stderr = '') => {
      const elapsed = Date.now() - started;
      const output = `${stdout}\n${stderr}`;
      const ok = !err; // ping exit code 0 on success
      let timeMs: number | undefined;
      const match = output.match(/time[=<]([\d\.]+)\s*ms/i);
      if (match) timeMs = parseFloat(match[1]);
      resolve({ ip, reachable: ok, timeMs: timeMs ?? elapsed });
    });
    child.on('error', () => resolve({ ip, reachable: false }));
  });
}

