import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/maintenance.controller.js';

const router = Router();
router.get('/', auth(true), requireRole('ADMIN','MANAGER'), ctrl.list);
router.post('/', auth(true), requireRole('ADMIN','MANAGER'), ctrl.create);
router.delete('/:id', auth(true), requireRole('ADMIN'), ctrl.remove);

export default router;

