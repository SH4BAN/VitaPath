import { Router } from 'express';
import { createAssignment, endAssignment, getMe, listAssignments, listCareTeam, updateMe } from '../controllers/users.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.get('/me', asyncHandler(getMe));
router.patch('/me', asyncHandler(updateMe));
router.get('/care-team', asyncHandler(listCareTeam));
router.get('/assignments', asyncHandler(listAssignments));
router.post('/assignments', requireRole('admin'), asyncHandler(createAssignment));
router.patch('/assignments/:assignmentId/end', requireRole('admin'), asyncHandler(endAssignment));

export default router;
