import { Router } from 'express';
import { loginController, meController, logoutController } from '../controllers/auth.controller.js';
import { auth as requireAuth } from '../middleware/auth.js';

// tiny async wrapper so thrown promises go to error middleware (no crashes)
const asyncHandler =
  (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

const router = Router();

// /auth/login does NOT require a token
router.post('/login', asyncHandler(loginController));

// /auth/me MUST run the auth middleware FIRST, then the controller
router.get('/me', requireAuth(true), asyncHandler(meController));
router.post('/logout', requireAuth(true), asyncHandler(logoutController));

export default router;
