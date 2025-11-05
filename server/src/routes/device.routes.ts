import { Router } from 'express';
import * as ctrl from '../controllers/device.controller.js';
import { auth, requireRole } from '../middleware/auth.js';
import * as statusCtrl from '../controllers/status.controller.js';
import * as snmpCtrl from '../controllers/snmp.controller.js';

const router = Router();

// List & read (all authenticated)
router.get('/', auth(true), ctrl.list);
router.get('/ping/ip', auth(true), ctrl.ping);
router.get('/summary', auth(true), statusCtrl.getSummary);
router.get('/:id', auth(true), ctrl.getOne);
router.post('/:id/status/mock', auth(true), requireRole('ADMIN'), statusCtrl.setMockStatus);
router.get('/:id/status', auth(true), statusCtrl.getStatus);
router.get('/:id/snmp', auth(true), snmpCtrl.getSnmpBasics);

// Create/Update/Delete (MANAGER or ADMIN)
router.post('/', auth(true), requireRole('MANAGER','ADMIN'), ctrl.create);
router.put('/:id', auth(true), requireRole('MANAGER','ADMIN'), ctrl.update);
router.delete('/:id', auth(true), requireRole('MANAGER','ADMIN'), ctrl.remove);

// Import devices via CSV (body as JSON { csv: string })
router.post('/import', auth(true), requireRole('MANAGER','ADMIN'), ctrl.importCsv);

export default router;

