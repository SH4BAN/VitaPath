import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.post(
  '/register',
  validate({
    name: { required: true, type: 'string' },
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string', minLength: 8 },
    role: { enum: ['parent', 'doctor', 'municipality'] },
  }),
  asyncHandler(register),
);

router.post(
  '/login',
  validate({
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' },
  }),
  asyncHandler(login),
);

router.get('/me', requireAuth, asyncHandler(me));

export default router;
