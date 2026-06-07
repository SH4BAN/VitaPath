import { Router } from 'express';
import { createVisit, listVisits, monthlyReport, updateVisit } from '../controllers/visits.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(listVisits));
router.post(
  '/',
  requireRole('doctor', 'admin'),
  validate({
    childId: { required: true, type: 'string' },
    scheduledAt: { required: true, type: 'date' },
    visitType: { type: 'string' },
    location: { type: 'string' },
  }),
  asyncHandler(createVisit),
);
router.patch('/:visitId', asyncHandler(updateVisit));
router.get('/reports/monthly', requireRole('doctor', 'admin'), asyncHandler(monthlyReport));

export default router;
