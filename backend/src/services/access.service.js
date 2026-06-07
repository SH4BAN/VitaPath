import { query } from '../db/pool.js';

export async function getAccessibleChild(childId, user) {
  const { rows } = await query('SELECT * FROM children WHERE id = $1', [childId]);
  const child = rows[0];
  if (!child) {
    const error = new Error('Child not found');
    error.status = 404;
    throw error;
  }

  if (user.role === 'parent') {
    if (child.parent_id !== user.id) {
      const error = new Error('You can only access children linked to your parent account');
      error.status = 403;
      throw error;
    }
    return child;
  }

  if (user.role === 'doctor') {
    const { rows: assignments } = await query(
      `SELECT 1
       WHERE EXISTS (
         SELECT 1
         FROM care_assignments ca
         WHERE ca.provider_id = $1
           AND ca.parent_id = $2
           AND ca.status = 'active'
           AND (ca.child_id IS NULL OR ca.child_id = $3)
       )
       OR EXISTS (
         SELECT 1
         FROM home_visits hv
         WHERE hv.nurse_id = $1
           AND hv.child_id = $3
       )
       OR EXISTS (
         SELECT 1
         FROM appointments a
         WHERE a.provider_id = $1
           AND a.child_id = $3
       )
       LIMIT 1`,
      [user.id, child.parent_id, child.id],
    );
    if (!assignments[0]) {
      const error = new Error('You can only access children assigned to your care team account');
      error.status = 403;
      throw error;
    }
  }

  return child;
}

export function childFilterForUser(user) {
  if (user.role === 'parent') {
    return { where: 'WHERE c.parent_id = $1', params: [user.id] };
  }
  if (user.role === 'doctor') {
    return {
      where: `WHERE EXISTS (
        SELECT 1
        FROM care_assignments ca
        WHERE ca.provider_id = $1
          AND ca.parent_id = c.parent_id
          AND ca.status = 'active'
          AND (ca.child_id IS NULL OR ca.child_id = c.id)
      )`,
      params: [user.id],
    };
  }
  return { where: '', params: [] };
}

export async function assertParentProviderLinked(parentId, providerId, childId = null) {
  const { rows } = await query(
    `SELECT 1
     FROM care_assignments
     WHERE parent_id = $1
       AND provider_id = $2
       AND status = 'active'
       AND ($3::uuid IS NULL OR child_id IS NULL OR child_id = $3)
     LIMIT 1`,
    [parentId, providerId, childId],
  );
  if (!rows[0]) {
    const error = new Error('Parent and provider are not assigned to each other');
    error.status = 403;
    throw error;
  }
}
