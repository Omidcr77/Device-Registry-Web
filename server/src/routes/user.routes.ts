import { Router } from 'express';
import * as ctrl from '../controllers/user.controller.js';
import { auth, requireRole } from '../middleware/auth.js';

const router = Router();
// Settings routes MUST be declared before any dynamic ":id" routes
router.get('/settings', auth(true), ctrl.getSettings);
router.put('/settings', auth(true), ctrl.updateSettings);

router.get('/', auth(true), requireRole('ADMIN'), ctrl.list);
router.post('/', auth(true), requireRole('ADMIN'), ctrl.create);
router.get('/export', auth(true), requireRole('ADMIN'), ctrl.exportUsers);
router.post('/import', auth(true), requireRole('ADMIN'), ctrl.importUsers);
// Allow users to update their own profile (email/locations), and admins to update anyone.
router.put('/:id', auth(true), ctrl.update);
router.put('/:id/password', auth(true), ctrl.changePassword);
router.delete('/:id', auth(true), requireRole('ADMIN'), ctrl.remove);

export default router;
