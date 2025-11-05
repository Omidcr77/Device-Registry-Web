import mongoose, { Schema, model } from 'mongoose';

let memoryServer: any = null;
const uriEnv = process.env.MONGO_URI || 'mongodb://localhost:27017/device_registry';

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  let uri = uriEnv;
  if (uri === 'memory' || process.env.NODE_ENV === 'test') {
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
    } catch (e) {
      console.warn('mongodb-memory-server not available; falling back to default MONGO_URI');
    }
  }
  await mongoose.connect(uri);
}

const UserSchema = new Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String },
  password: { type: String, required: true },
  role: { type: String, default: 'VIEWER' },
  locations: { type: [String], default: [] },
  status: { type: String, default: 'ACTIVE' },
  settings: { type: Schema.Types.Mixed, default: {} },
  name: { type: String },
}, { timestamps: true });

const DeviceSchema = new Schema({
  code: { type: String, unique: true, required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  customer: { type: String, required: true },
  location: { type: String, required: true },
  installDate: { type: Date, required: true },
  ip: { type: String, required: true },
  createdById: { type: String },
}, { timestamps: true });

const DeviceStatusSchema = new Schema({
  deviceId: { type: String, unique: true, required: true },
  reachable: { type: Boolean, default: false },
  lastSeen: { type: Date },
  latencyMs: { type: Number },
  uptimePct: { type: Number, default: 0 },
  checks: { type: Number, default: 0 },
  failures: { type: Number, default: 0 },
  lastChangeAt: { type: Date },
  transitions5m: { type: Number, default: 0 },
}, { timestamps: { createdAt: false, updatedAt: true } });

const MaintenanceWindowSchema = new Schema({
  deviceId: { type: String },
  location: { type: String },
  reason: { type: String },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  createdById: { type: String },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const UserModel = model('User', UserSchema);
export const DeviceModel = model('Device', DeviceSchema);
export const DeviceStatusModel = model('DeviceStatus', DeviceStatusSchema);
export const MaintenanceWindowModel = model('MaintenanceWindow', MaintenanceWindowSchema);
