import app from './app';
import os from 'os';
import { ENV } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import deviceRoutes from './routes/device.routes.js';
import userRoutes from './routes/user.routes.js';
import { updateDeviceStatus, isInMaintenance, setWsServer, broadcastStatus } from './services/status.service.js';
import { connectMongo, DeviceModel } from './db/mongo.js';
import searchRoutes from './routes/search.routes.js';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middleware/error.js';

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/search', searchRoutes);
// Maintenance routes mounted lazily if present
import reportRoutes from './routes/report.routes.js';

app.use('/api/reports', reportRoutes);
app.use('/api/health', healthRoutes);

const getLanIps = () => {
  const nets = os.networkInterfaces();
  const addrs: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (!net.internal && net.family === 'IPv4') addrs.push(net.address);
    }
  }
  return addrs;
};

const server = app.listen(ENV.PORT, '0.0.0.0', () => {
  const ips = getLanIps();
  console.log(`Server listening on:`);
  console.log(`  - http://localhost:${ENV.PORT}`);
  ips.forEach((ip) => console.log(`  - http://${ip}:${ENV.PORT}`));
});

// WebSocket setup (optional dependency 'ws')
(async () => {
  try {
    const { WebSocketServer } = await import('ws');
    const wss = new WebSocketServer({ noServer: true });
    setWsServer(wss);
    server.on('upgrade', (request: any, socket: any, head: any) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      if (url.pathname !== '/ws') {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request as any, socket as any, head as any, (ws: any) => {
        wss.emit('connection', ws, request);
      });
    });
    wss.on('connection', (ws: any) => {
      ws.send(JSON.stringify({ type: 'hello', message: 'connected' }));
    });

    // scheduler
    const tick = async () => {
      try {
        await connectMongo();
        const devices: any[] = await DeviceModel.find({}, { _id: 1, ip: 1, location: 1 }).lean();
        for (const d of devices) {
          try {
            const id = String(d._id);
            const suppressed = await isInMaintenance(id, d.location);
            const status = await updateDeviceStatus({ id, ip: d.ip, location: d.location });
            broadcastStatus({
              type: 'device-status',
              deviceId: id,
              reachable: status.reachable,
              latencyMs: status.latencyMs,
              uptimePct: status.uptimePct,
              lastChangeAt: (status as any).lastChangeAt || null,
              ts: Date.now(),
              suppressed,
            });
          } catch {}
        }
      } catch (e) {
        console.error('Scheduler error', e);
      }
    };
    setInterval(tick, ENV.STATUS_TICK_MS || 15000).unref?.();
    setTimeout(tick, 2000).unref?.();
  } catch (e) {
    console.log('ws not installed; live updates disabled');
  }
})();

// Error handler should be last in the middleware chain
app.use(errorHandler);


