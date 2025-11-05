import express from 'express';
import os from 'os';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ENV } from './config/env.js';

const app = express();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

const allow = (ENV.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// Dev convenience: also allow common dev ports
['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173', 'http://192.168.0.200:3000'].forEach(o => {
  if (!allow.includes(o)) allow.push(o);
});

// Also allow this machine's LAN IPv4 addresses on common dev ports
const nets = os.networkInterfaces();
const lanIps = new Set<string>();
for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
    if (!net.internal && net.family === 'IPv4') {
      const ip = net.address;
      // push typical dev ports used by Vite/React
      ['3000', '3001', '5173'].forEach((p) => lanIps.add(`http://${ip}:${p}`));
    }
  }
}
lanIps.forEach((o) => { if (!allow.includes(o)) allow.push(o); });

console.log('CORS allow list:', allow);

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);          // same-origin/tools
    if (allow.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
}));

// (optional) ensure preflights get the same CORS handling
app.options('*', cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allow.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 204,
}));

export default app;
