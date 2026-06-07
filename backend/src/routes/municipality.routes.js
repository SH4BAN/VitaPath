import { Router } from 'express';
import { getOverview, generateReport } from '../controllers/municipality.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireRole('municipality', 'admin'));
router.get('/overview', asyncHandler(getOverview));
router.post('/report', asyncHandler(generateReport));

export default router;
