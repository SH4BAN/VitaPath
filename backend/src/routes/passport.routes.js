import { Router } from 'express';
import { generatePassportToken, getPassport, verifyPassport } from '../controllers/passport.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// Public: verify scanned QR token — must be before /:childId to avoid route conflict
router.get('/verify', asyncHandler(verifyPassport));

// Parent/doctor: get full passport data
router.get('/:childId', requireAuth, requireRole('parent', 'doctor', 'admin'), asyncHandler(getPassport));

// Parent: generate a signed QR token (15 min TTL)
router.post('/:childId/token', requireAuth, requireRole('parent', 'doctor', 'admin'), asyncHandler(generatePassportToken));

export default router;
