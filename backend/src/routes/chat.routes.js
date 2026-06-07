import { Router } from 'express';
import { chat } from '../controllers/chat.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, requireRole('parent'), asyncHandler(chat));

export default router;
