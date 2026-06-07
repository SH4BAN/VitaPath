import { Router } from 'express';
import { listEmailOutbox, listNotifications, respondNotification, sendAppointmentReminders } from '../controllers/notifications.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(listNotifications));
router.get('/email-outbox', asyncHandler(listEmailOutbox));
router.patch('/:notificationId/respond', asyncHandler(respondNotification));
router.post('/reminders/appointments', requireRole('doctor', 'admin'), asyncHandler(sendAppointmentReminders));

export default router;
