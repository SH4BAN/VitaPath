import { Router } from 'express';
import { analyzeChildRisk, listRiskAlerts, recalculateRisk } from '../controllers/risk.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/alerts', asyncHandler(listRiskAlerts));
router.post('/recalculate', requireRole('doctor', 'admin'), asyncHandler(recalculateRisk));
router.post('/children/:childId/analyze', requireRole('doctor', 'admin'), asyncHandler(analyzeChildRisk));

export default router;
