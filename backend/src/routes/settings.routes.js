import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(getSettings));
router.patch('/', asyncHandler(updateSettings));

export default router;
