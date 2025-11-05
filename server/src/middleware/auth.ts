import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export function auth(required = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header) {
      if (!required) return next();
      return res.status(401).json({ message: 'Missing Authorization header' });
    }
    const token = header.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, ENV.JWT_SECRET) as any;
      req.user = { id: decoded.id, role: decoded.role, email: decoded.email };
      return next();
    } catch (e) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

export function requireRole(...roles: Array<'ADMIN'|'MANAGER'|'VIEWER'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
