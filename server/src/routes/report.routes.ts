import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/report.controller.js';

const router = Router();

router.get('/', auth(true), ctrl.listReports);
router.get('/export', auth(true), ctrl.exportReport);
router.get('/:reportId/export', auth(true), ctrl.exportReport);

export default router;

