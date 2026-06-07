import { Router } from 'express';
import { childTimeline, missedActions, parentOverview, providerStats, upcomingReminders } from '../controllers/dashboard.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/parent/overview', asyncHandler(parentOverview));
router.get('/children/:childId/timeline', asyncHandler(childTimeline));
router.get('/reminders/upcoming', asyncHandler(upcomingReminders));
router.get('/actions/missed', asyncHandler(missedActions));
router.get('/provider/stats', requireRole('doctor', 'admin'), asyncHandler(providerStats));

export default router;
