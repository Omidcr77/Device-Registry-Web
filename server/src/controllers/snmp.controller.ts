import { Request, Response } from 'express';
import { connectMongo, DeviceModel } from '../db/mongo.js';

export async function getSnmpBasics(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await connectMongo();
    const device: any = await DeviceModel.findById(id).lean();
    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Attempt to use net-snmp if installed and SNMP env vars provided
    const community = process.env.SNMP_COMMUNITY || 'public';
    try {
      const snmp = await import('net-snmp');
      const session = snmp.createSession(device.ip, community);
      const oids = ['1.3.6.1.2.1.1.5.0', '1.3.6.1.2.1.1.3.0']; // sysName.0, sysUpTime.0
      session.get(oids, (err: any, varbinds: any[]) => {
        if (err) {
          session.close();
          return res.status(502).json({ error: 'SNMP error', detail: String(err) });
        }
        const sysName = varbinds[0]?.value?.toString?.() ?? null;
        const sysUpTime = varbinds[1]?.value ?? null;
        session.close();
        return res.json({ sysName, sysUpTime });
      });
    } catch {
      // Fallback mock if net-snmp not installed
      return res.json({ sysName: device.name, sysUpTime: null, note: 'net-snmp not installed; returning fallback' });
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to query SNMP' });
  }
}

