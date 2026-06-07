import { query } from '../db/pool.js';
import { getAccessibleChild } from '../services/access.service.js';
import { audit } from '../services/audit.service.js';
import { notifyAppointmentScheduled, notifyUserWithEmail } from '../services/notification.service.js';

function appointmentSelect(where = '', order = 'ORDER BY a.scheduled_at ASC') {
  return `
    SELECT
      a.*,
      c.full_name AS child_name,
      c.date_of_birth,
      parent.name AS parent_name,
      provider.name AS provider_name
    FROM appointments a
    JOIN children c ON c.id = a.child_id
    JOIN users parent ON parent.id = a.parent_id
    LEFT JOIN users provider ON provider.id = a.provider_id
    ${where}
    ${order}
  `;
}

export async function listAppointments(req, res) {
  const params = [];
  const clauses = [];

  if (req.user.role === 'parent') {
    params.push(req.user.id);
    clauses.push(`a.parent_id = $${params.length}`);
  } else if (req.user.role === 'doctor') {
    params.push(req.user.id);
    clauses.push(`(
      a.provider_id = $${params.length}
      OR EXISTS (
        SELECT 1
        FROM care_assignments ca
        WHERE ca.provider_id = $${params.length}
          AND ca.parent_id = c.parent_id
          AND ca.status = 'active'
          AND (ca.child_id IS NULL OR ca.child_id = c.id)
      )
    )`);
  }

  if (req.query.status) {
    params.push(req.query.status);
    clauses.push(`a.status = $${params.length}`);
  }

  if (req.query.childId) {
    params.push(req.query.childId);
    clauses.push(`a.child_id = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(appointmentSelect(where), params);
  res.json({ appointments: rows });
}

export async function createAppointment(req, res) {
  const { childId, providerId, type, scheduledAt, location, notes } = req.body;
  const child = await getAccessibleChild(childId, req.user);
  const assignedProvider = req.user.role === 'doctor' ? req.user.id : providerId || null;

  const { rows } = await query(
    `INSERT INTO appointments (child_id, parent_id, provider_id, type, scheduled_at, location, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [childId, child.parent_id, assignedProvider, type, scheduledAt, location || null, notes || null],
  );

  await notifyAppointmentScheduled({
    parentId: child.parent_id,
    childId,
    childName: child.full_name,
    type,
    scheduledAt,
    location,
    appointmentId: rows[0].id,
  });

  await audit(req.user.id, 'create', 'appointment', rows[0].id, { childId, type });
  res.status(201).json({ appointment: rows[0] });
}

export async function updateAppointment(req, res) {
  const { appointmentId } = req.params;
  const { type, scheduledAt, location, notes, status, providerId } = req.body;

  const { rows: existingRows } = await query(appointmentSelect('WHERE a.id = $1'), [appointmentId]);
  const existing = existingRows[0];
  if (!existing) {
    const error = new Error('Appointment not found');
    error.status = 404;
    throw error;
  }
  await getAccessibleChild(existing.child_id, req.user);

  const { rows } = await query(
    `UPDATE appointments
     SET type = COALESCE($1, type),
         scheduled_at = COALESCE($2, scheduled_at),
         location = COALESCE($3, location),
         notes = COALESCE($4, notes),
         status = COALESCE($5, status),
         provider_id = COALESCE($6, provider_id),
         updated_at = now()
     WHERE id = $7
     RETURNING *`,
    [type, scheduledAt, location, notes, status, providerId, appointmentId],
  );

  if (scheduledAt || location || status) {
    await notifyUserWithEmail({
      userId: existing.parent_id,
      childId: existing.child_id,
      title: 'Appointment updated',
      body: `${existing.child_name}'s ${type || existing.type} appointment was updated. New date: ${new Date(scheduledAt || existing.scheduled_at).toLocaleString('en-GB')}.${location || existing.location ? ` Location: ${location || existing.location}.` : ''}`,
      category: 'appointment',
      dueAt: scheduledAt || existing.scheduled_at,
      actionUrl: `/appointments/${appointmentId}`,
      emailSubject: `SAFE appointment updated: ${existing.child_name}`,
    });
  }

  await audit(req.user.id, 'update', 'appointment', appointmentId, { status, scheduledAt });
  res.json({ appointment: rows[0] });
}

export async function respondAppointment(req, res) {
  const { appointmentId } = req.params;
  const { action, requestedTime, message } = req.body;
  const allowed = ['confirm', 'reschedule', 'cancel'];
  if (!allowed.includes(action)) {
    const error = new Error('action must be confirm, reschedule, or cancel');
    error.status = 400;
    throw error;
  }

  const { rows: existingRows } = await query(appointmentSelect('WHERE a.id = $1'), [appointmentId]);
  const existing = existingRows[0];
  if (!existing) {
    const error = new Error('Appointment not found');
    error.status = 404;
    throw error;
  }
  if (req.user.role === 'parent' && existing.parent_id !== req.user.id) {
    const error = new Error('You can only respond to your own appointments');
    error.status = 403;
    throw error;
  }

  const nextStatus = action === 'confirm' ? 'confirmed' : action === 'reschedule' ? 'reschedule_requested' : 'cancelled';
  const { rows } = await query(
    `UPDATE appointments
     SET status = $1,
         parent_response = $2,
         requested_time = $3,
         responded_at = now(),
         updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [nextStatus, message || null, requestedTime || null, appointmentId],
  );

  if (existing.provider_id) {
    await query(
      `INSERT INTO notifications (user_id, child_id, title, body, category, due_at, action_url)
       VALUES ($1, $2, $3, $4, 'appointment', now(), $5)`,
      [
        existing.provider_id,
        existing.child_id,
        'Parent responded to appointment',
        `${existing.parent_name} marked appointment as ${nextStatus.replace('_', ' ')}.`,
        `/appointments/${appointmentId}`,
      ],
    );
  }

  await audit(req.user.id, 'respond', 'appointment', appointmentId, { action, requestedTime });
  res.json({ appointment: rows[0] });
}
