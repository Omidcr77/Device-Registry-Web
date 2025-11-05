import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { globalSearch } from '../controllers/search.controller.js';
const router = Router();

router.get('/', auth(true), globalSearch);

export default router;
