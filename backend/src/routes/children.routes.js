import { Router } from 'express';
import { createChild, deleteChild, getChild, listChildren, updateChild } from '../controllers/children.controller.js';
import { createRecord, deleteRecord, listRecords, updateRecord, useRecordType } from '../controllers/records.controller.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const careStatus = ['pending', 'completed', 'missed', 'delayed'];

router.use(requireAuth);

router.get('/', asyncHandler(listChildren));
router.post(
  '/',
  validate({
    fullName: { required: true, type: 'string' },
    dateOfBirth: { required: true, type: 'date' },
    gender: { required: true, enum: ['female', 'male', 'other'] },
  }),
  asyncHandler(createChild),
);
router.get('/:childId', asyncHandler(getChild));
router.patch('/:childId', asyncHandler(updateChild));
router.delete('/:childId', asyncHandler(deleteChild));

router.get('/:childId/vaccinations', useRecordType('vaccinations'), asyncHandler(listRecords));
router.post(
  '/:childId/vaccinations',
  useRecordType('vaccinations'),
  validate({
    vaccineName: { required: true, type: 'string' },
    recommendedDate: { required: true, type: 'date' },
    scheduledDate: { type: 'date' },
    completedDate: { type: 'date' },
    status: { enum: careStatus },
  }),
  asyncHandler(createRecord),
);
router.patch('/:childId/vaccinations/:vaccinationId', useRecordType('vaccinations'), asyncHandler(updateRecord));
router.delete('/:childId/vaccinations/:vaccinationId', useRecordType('vaccinations'), asyncHandler(deleteRecord));

router.get('/:childId/checkups', useRecordType('checkups'), asyncHandler(listRecords));
router.post(
  '/:childId/checkups',
  useRecordType('checkups'),
  validate({
    checkupType: { required: true, type: 'string' },
    scheduledDate: { required: true, type: 'date' },
    completedDate: { type: 'date' },
    notes: { type: 'string' },
    status: { enum: careStatus },
  }),
  asyncHandler(createRecord),
);
router.patch('/:childId/checkups/:checkupId', useRecordType('checkups'), asyncHandler(updateRecord));
router.delete('/:childId/checkups/:checkupId', useRecordType('checkups'), asyncHandler(deleteRecord));

router.get('/:childId/milestones', useRecordType('milestones'), asyncHandler(listRecords));
router.post(
  '/:childId/milestones',
  useRecordType('milestones'),
  validate({
    title: { required: true, type: 'string' },
    description: { type: 'string' },
    expectedDate: { type: 'date' },
    achievedDate: { type: 'date' },
    status: { enum: careStatus },
  }),
  asyncHandler(createRecord),
);
router.patch('/:childId/milestones/:milestoneId', useRecordType('milestones'), asyncHandler(updateRecord));
router.delete('/:childId/milestones/:milestoneId', useRecordType('milestones'), asyncHandler(deleteRecord));

export default router;
