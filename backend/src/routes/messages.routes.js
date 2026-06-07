import { Router } from 'express';
import { listMessages, markRead, sendMessage } from '../controllers/messages.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(listMessages));
router.post(
  '/',
  validate({
    recipientId: { required: true, type: 'string' },
    body: { required: true, type: 'string' },
  }),
  asyncHandler(sendMessage),
);
router.patch('/:messageId/read', asyncHandler(markRead));

export default router;
