import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectMongo, UserModel, DeviceModel } from '../src/db/mongo.js';

async function main() {
  await connectMongo();
  const adminEmail = 'admin@example.com';
  const managerEmail = 'manager@example.com';
  const viewerEmail = 'viewer@example.com';

  await UserModel.updateOne({ email: adminEmail }, {
    $setOnInsert: {
      email: adminEmail,
      password: await bcrypt.hash('Admin@1234', 10),
      role: 'ADMIN',
      locations: ['HQ', 'Building A', 'Building B'],
      status: 'ACTIVE',
    }
  }, { upsert: true });

  await UserModel.updateOne({ email: managerEmail }, {
    $setOnInsert: {
      email: managerEmail,
      password: await bcrypt.hash('Manager@12345', 10),
      role: 'MANAGER',
      locations: ['Building A'],
      status: 'ACTIVE',
    }
  }, { upsert: true });

  await UserModel.updateOne({ email: viewerEmail }, {
    $setOnInsert: {
      email: viewerEmail,
      password: await bcrypt.hash('Viewer@12345', 10),
      role: 'VIEWER',
      locations: ['Building B'],
      status: 'ACTIVE',
    }
  }, { upsert: true });

  const devices = [
    { code: 'D001', type: 'Router', name: 'RT-Main-01', customer: 'TelcoNet', location: 'HQ',         installDate: new Date('2024-01-15'), ip: '192.168.1.1' },
    { code: 'D002', type: 'SXT',    name: 'SXT-Link-02', customer: 'Digital ISP', location: 'Building A', installDate: new Date('2024-02-20'), ip: '192.168.1.5' },
    { code: 'D003', type: 'Switch', name: 'SW-Core-01',  customer: 'TelcoNet',   location: 'HQ',         installDate: new Date('2024-01-10'), ip: '192.168.1.10' },
  ];
  for (const d of devices) {
    await DeviceModel.updateOne({ code: d.code }, { $setOnInsert: d }, { upsert: true });
  }

  console.log('Mongo seed complete');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

