import { query } from '../db/pool.js';
import { getAccessibleChild } from '../services/access.service.js';

const recordConfig = {
  vaccinations: {
    table: 'vaccinations',
    id: 'vaccinationId',
    fields: ['vaccine_name', 'recommended_date', 'scheduled_date', 'completed_date', 'status'],
    map: (body) => ({
      vaccine_name: body.vaccineName,
      recommended_date: body.recommendedDate,
      scheduled_date: body.scheduledDate,
      completed_date: body.completedDate,
      status: body.status ?? 'pending',
    }),
  },
  checkups: {
    table: 'checkups',
    id: 'checkupId',
    fields: ['checkup_type', 'scheduled_date', 'completed_date', 'notes', 'status'],
    map: (body) => ({
      checkup_type: body.checkupType,
      scheduled_date: body.scheduledDate,
      completed_date: body.completedDate,
      notes: body.notes,
      status: body.status ?? 'pending',
    }),
  },
  milestones: {
    table: 'milestones',
    id: 'milestoneId',
    fields: ['title', 'description', 'expected_date', 'achieved_date', 'status'],
    map: (body) => ({
      title: body.title,
      description: body.description,
      expected_date: body.expectedDate,
      achieved_date: body.achievedDate,
      status: body.status ?? 'pending',
    }),
  },
};

function configFor(req) {
  return recordConfig[req.recordType];
}

export function useRecordType(type) {
  return (req, _res, next) => {
    req.recordType = type;
    next();
  };
}

export async function listRecords(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  const config = configFor(req);
  const { rows } = await query(`SELECT * FROM ${config.table} WHERE child_id = $1 ORDER BY created_at DESC`, [
    req.params.childId,
  ]);
  res.json({ [req.recordType]: rows });
}

export async function createRecord(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  const config = configFor(req);
  const data = config.map(req.body);
  const columns = ['child_id', ...config.fields];
  const values = [req.params.childId, ...config.fields.map((field) => data[field] ?? null)];
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  const { rows } = await query(
    `INSERT INTO ${config.table} (${columns.join(', ')})
     VALUES (${placeholders})
     RETURNING *`,
    values,
  );
  res.status(201).json({ [req.recordType.slice(0, -1)]: rows[0] });
}

export async function updateRecord(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  const config = configFor(req);
  const data = config.map(req.body);
  const values = [];
  const assignments = [];

  for (const field of config.fields) {
    if (data[field] !== undefined) {
      values.push(data[field]);
      assignments.push(`${field} = $${values.length}`);
    }
  }

  if (assignments.length === 0) {
    const error = new Error('At least one field is required for update');
    error.status = 400;
    throw error;
  }

  values.push(req.params[config.id], req.params.childId);
  const { rows } = await query(
    `UPDATE ${config.table}
     SET ${assignments.join(', ')}, updated_at = now()
     WHERE id = $${values.length - 1} AND child_id = $${values.length}
     RETURNING *`,
    values,
  );
  if (!rows[0]) {
    const error = new Error('Record not found');
    error.status = 404;
    throw error;
  }
  res.json({ [req.recordType.slice(0, -1)]: rows[0] });
}

export async function deleteRecord(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  const config = configFor(req);
  await query(`DELETE FROM ${config.table} WHERE id = $1 AND child_id = $2`, [
    req.params[config.id],
    req.params.childId,
  ]);
  res.status(204).send();
}
