import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { audit } from '../services/audit.service.js';
import { notifyCareAssignmentCreated } from '../services/notification.service.js';

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    municipality: user.municipality,
    address: user.address,
  };
}

export async function listCareTeam(req, res) {
  let rows;
  if (req.user.role === 'parent') {
    ({ rows } = await query(
      `(SELECT DISTINCT u.id, u.name, u.email, u.role, u.phone, u.municipality, u.address,
               ca.relationship, ca.child_id, ca.status
        FROM care_assignments ca
        JOIN users u ON u.id = ca.provider_id
        WHERE ca.parent_id = $1 AND ca.status = 'active')
       UNION
       (SELECT id, name, email, role, phone, municipality, address,
               'support' AS relationship, null::uuid AS child_id, 'active' AS status
        FROM users
        WHERE role = 'admin')
       ORDER BY name`,
      [req.user.id],
    ));
  } else if (req.user.role === 'doctor') {
    ({ rows } = await query(
      `(SELECT DISTINCT u.id, u.name, u.email, u.role, u.phone, u.municipality, u.address,
               ca.relationship, ca.child_id, ca.status
        FROM care_assignments ca
        JOIN users u ON u.id = ca.parent_id
        WHERE ca.provider_id = $1 AND ca.status = 'active')
       UNION
       (SELECT id, name, email, role, phone, municipality, address,
               'support' AS relationship, null::uuid AS child_id, 'active' AS status
        FROM users
        WHERE role = 'admin')
       ORDER BY name`,
      [req.user.id],
    ));
  } else {
    ({ rows } = await query(
      `SELECT id, name, email, role, phone, municipality, address
       FROM users
       WHERE role IN ('doctor', 'admin', 'parent')
       ORDER BY role, name`,
    ));
  }
  res.json({ users: rows });
}

export async function listAssignments(req, res) {
  const params = [];
  const clauses = ["ca.status = 'active'"];
  if (req.user.role === 'parent') {
    params.push(req.user.id);
    clauses.push(`ca.parent_id = $${params.length}`);
  }
  if (req.user.role === 'doctor') {
    params.push(req.user.id);
    clauses.push(`ca.provider_id = $${params.length}`);
  }
  if (req.query.parentId && req.user.role === 'admin') {
    params.push(req.query.parentId);
    clauses.push(`ca.parent_id = $${params.length}`);
  }
  if (req.query.providerId && req.user.role === 'admin') {
    params.push(req.query.providerId);
    clauses.push(`ca.provider_id = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT ca.*,
            parent.name AS parent_name,
            parent.email AS parent_email,
            provider.name AS provider_name,
            provider.email AS provider_email,
            c.full_name AS child_name
     FROM care_assignments ca
     JOIN users parent ON parent.id = ca.parent_id
     JOIN users provider ON provider.id = ca.provider_id
     LEFT JOIN children c ON c.id = ca.child_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY ca.assigned_at DESC`,
    params,
  );
  res.json({ assignments: rows });
}

export async function createAssignment(req, res) {
  const { parentId, providerId, childId, relationship, notes } = req.body;
  const { rows: users } = await query(
    `SELECT id, role, name, email FROM users WHERE id IN ($1, $2)`,
    [parentId, providerId],
  );
  const parent = users.find((user) => user.id === parentId);
  const provider = users.find((user) => user.id === providerId);
  if (!parent || parent.role !== 'parent' || !provider || provider.role !== 'doctor') {
    const error = new Error('Assignment requires a parent user and a doctor/provider user');
    error.status = 400;
    throw error;
  }
  if (childId) {
    const { rows: children } = await query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [childId, parentId]);
    if (!children[0]) {
      const error = new Error('Child must belong to the selected parent');
      error.status = 400;
      throw error;
    }
  }

  const { rows } = await query(
    `INSERT INTO care_assignments (parent_id, provider_id, child_id, relationship, notes)
     VALUES ($1, $2, $3, COALESCE($4, 'assigned_nurse'), $5)
     ON CONFLICT (parent_id, provider_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid))
       WHERE status = 'active'
     DO UPDATE SET relationship = EXCLUDED.relationship, notes = EXCLUDED.notes, updated_at = now()
     RETURNING *`,
    [parentId, providerId, childId || null, relationship || null, notes || null],
  );
  const { rows: childRows } = childId
    ? await query('SELECT full_name FROM children WHERE id = $1', [childId])
    : { rows: [] };
  await notifyCareAssignmentCreated({
    parentId,
    providerId,
    childId: childId || null,
    parentName: parent.name,
    providerName: provider.name,
    childName: childRows[0]?.full_name || null,
  });
  await audit(req.user.id, 'create', 'care_assignment', rows[0].id, { parentId, providerId, childId });
  res.status(201).json({ assignment: rows[0] });
}

export async function endAssignment(req, res) {
  const { rows } = await query(
    `UPDATE care_assignments
     SET status = 'ended', ended_at = now(), updated_at = now()
     WHERE id = $1 AND status = 'active'
     RETURNING *`,
    [req.params.assignmentId],
  );
  if (!rows[0]) {
    const error = new Error('Assignment not found');
    error.status = 404;
    throw error;
  }
  await audit(req.user.id, 'end', 'care_assignment', rows[0].id, {});
  res.json({ assignment: rows[0] });
}

export async function getMe(req, res) {
  const { rows } = await query('SELECT id, name, email, role, phone, municipality, address FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: publicUser(rows[0]) });
}

export async function updateMe(req, res) {
  const { name, email, phone, municipality, address, password } = req.body;
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const { rows } = await query(
    `UPDATE users
     SET name = COALESCE($1, name),
         email = COALESCE(lower($2), email),
         phone = COALESCE($3, phone),
         municipality = COALESCE($4, municipality),
         address = COALESCE($5, address),
         password_hash = COALESCE($6, password_hash),
         updated_at = now()
     WHERE id = $7
     RETURNING id, name, email, role, phone, municipality, address`,
    [name, email, phone, municipality, address, passwordHash, req.user.id],
  );

  await audit(req.user.id, 'update', 'user_profile', req.user.id, { changedPassword: Boolean(password) });
  res.json({ user: publicUser(rows[0]) });
}
