import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import { connectMongo } from '../db/mongo.js';

export async function health(req: Request, res: Response) {
  try {
    try { await connectMongo(); } catch {}
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    const states: Record<number, string> = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    return res.json({
      ok: true,
      now: Date.now(),
      uptimeMs: Math.round(process.uptime() * 1000),
      env: ENV.NODE_ENV,
      mongo: states[state] ?? String(state),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'unhealthy' });
  }
}

