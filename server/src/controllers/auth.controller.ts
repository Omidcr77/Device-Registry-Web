import { Request, Response, NextFunction } from 'express';
import { login, me } from '../services/auth.service.js';
import { broadcastEvent } from '../services/status.service.js';

export async function loginController(req: Request, res: Response, _next?: NextFunction) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    const data = await login(String(username), String(password));
    try {
      broadcastEvent({ type: 'user-auth', action: 'login', user: { id: data.user.id, username: data.user.username, role: data.user.role } });
    } catch {}
    res.json(data);
  } catch (err: any) {
    const status = err?.status || 500;
    res.status(status).json({ message: err?.message || 'Login failed' });
  }
}

export async function meController(req: Request, res: Response, _next?: NextFunction) {
  // @ts-ignore - set by auth middleware
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const data = await me(userId);
  res.json(data);
}

export async function logoutController(req: Request, res: Response) {
  try {
    // @ts-ignore
    const u = req.user as any;
    if (u) {
      try { broadcastEvent({ type: 'user-auth', action: 'logout', user: { id: u.id, username: u.username, role: u.role } }); } catch {}
    }
    // stateless JWT — nothing to revoke server-side
    res.json({ message: 'Logged out' });
  } catch {
    res.status(200).json({ message: 'Logged out' });
  }
}
