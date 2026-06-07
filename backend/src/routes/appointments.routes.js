import { Router } from 'express';
import { createAppointment, listAppointments, respondAppointment, updateAppointment } from '../controllers/appointments.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(listAppointments));
router.post(
  '/',
  requireRole('doctor', 'admin'),
  validate({
    childId: { required: true, type: 'string' },
    type: { required: true, enum: ['vaccination', 'checkup', 'home_visit', 'dental', 'other'] },
    scheduledAt: { required: true, type: 'date' },
    location: { type: 'string' },
    notes: { type: 'string' },
  }),
  asyncHandler(createAppointment),
);
router.patch('/:appointmentId', requireRole('doctor', 'admin'), asyncHandler(updateAppointment));
router.patch('/:appointmentId/respond', asyncHandler(respondAppointment));

export default router;
