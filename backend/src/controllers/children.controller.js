import { query } from '../db/pool.js';
import { getAccessibleChild, childFilterForUser } from '../services/access.service.js';

function assertChildAge(dateOfBirth) {
  if (!dateOfBirth) return;
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;

  if (birthDate > today || age > 18) {
    const error = new Error('SAFE supports child records for ages 0 through 18');
    error.status = 400;
    throw error;
  }
}

export async function listChildren(req, res) {
  const filter = childFilterForUser(req.user);
  const { rows } = await query(
    `SELECT DISTINCT ON (c.id) c.*, u.name AS parent_name,
            provider.id AS assigned_provider_id,
            provider.name AS assigned_provider_name,
            provider.email AS assigned_provider_email
     FROM children c
     JOIN users u ON u.id = c.parent_id
     LEFT JOIN care_assignments ca ON ca.parent_id = c.parent_id
       AND ca.status = 'active'
       AND (ca.child_id IS NULL OR ca.child_id = c.id)
     LEFT JOIN users provider ON provider.id = ca.provider_id
     ${filter.where}
     ORDER BY c.id, ca.assigned_at DESC NULLS LAST`,
    filter.params,
  );
  res.json({ children: rows });
}

export async function createChild(req, res) {
  const parentId = req.user.role === 'parent' ? req.user.id : req.body.parentId;
  if (!parentId) {
    const error = new Error('parentId is required when a provider or admin creates a child');
    error.status = 400;
    throw error;
  }

  const { fullName, dateOfBirth, gender } = req.body;
  assertChildAge(dateOfBirth);
  const { rows } = await query(
    `INSERT INTO children (full_name, date_of_birth, gender, parent_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [fullName, dateOfBirth, gender, parentId],
  );
  if (req.user.role === 'doctor') {
    await query(
      `INSERT INTO care_assignments (parent_id, provider_id, child_id, relationship)
       VALUES ($1, $2, $3, 'assigned_nurse')
       ON CONFLICT (parent_id, provider_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid))
         WHERE status = 'active'
       DO NOTHING`,
      [parentId, req.user.id, rows[0].id],
    );
  }
  res.status(201).json({ child: rows[0] });
}

export async function getChild(req, res) {
  const child = await getAccessibleChild(req.params.childId, req.user);
  res.json({ child });
}

export async function updateChild(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  const { fullName, dateOfBirth, gender } = req.body;
  assertChildAge(dateOfBirth);
  const { rows } = await query(
    `UPDATE children
     SET full_name = COALESCE($1, full_name),
         date_of_birth = COALESCE($2, date_of_birth),
         gender = COALESCE($3, gender),
         updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [fullName, dateOfBirth, gender, req.params.childId],
  );
  res.json({ child: rows[0] });
}

export async function deleteChild(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  await query('DELETE FROM children WHERE id = $1', [req.params.childId]);
  res.status(204).send();
}
