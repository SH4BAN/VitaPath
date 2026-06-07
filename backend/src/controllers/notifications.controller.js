import { query } from '../db/pool.js';
import { audit } from '../services/audit.service.js';
import { notifyAppointmentReminder } from '../services/notification.service.js';

export async function listNotifications(req, res) {
  const { rows } = await query(
    `SELECT n.*, c.full_name AS child_name
     FROM notifications n
     LEFT JOIN children c ON c.id = n.child_id
     WHERE n.user_id = $1
     ORDER BY COALESCE(n.due_at, n.created_at) ASC`,
    [req.user.id],
  );
  res.json({ notifications: rows });
}

export async function listEmailOutbox(req, res) {
  const params = [];
  const clauses = [];
  if (req.user.role !== 'admin') {
    params.push(req.user.id);
    clauses.push(`e.user_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT e.id, e.notification_id, e.user_id, e.to_email, e.subject, e.body,
            e.status, e.error, e.sent_at, e.created_at, u.name AS user_name
     FROM email_outbox e
     LEFT JOIN users u ON u.id = e.user_id
     ${where}
     ORDER BY e.created_at DESC
     LIMIT 100`,
    params,
  );
  res.json({ emails: rows });
}

export async function respondNotification(req, res) {
  const { status = 'responded' } = req.body;
  const { rows } = await query(
    `UPDATE notifications
     SET status = $1, responded_at = CASE WHEN $1 = 'responded' THEN now() ELSE responded_at END
     WHERE id = $2 AND user_id = $3
     RETURNING *`,
    [status, req.params.notificationId, req.user.id],
  );
  if (!rows[0]) {
    const error = new Error('Notification not found');
    error.status = 404;
    throw error;
  }
  await audit(req.user.id, 'update', 'notification', req.params.notificationId, { status });
  res.json({ notification: rows[0] });
}

export async function sendAppointmentReminders(req, res) {
  const days = Number(req.body.days ?? req.query.days ?? 2);
  const { rows: appointments } = await query(
    `SELECT a.*, c.full_name AS child_name
     FROM appointments a
     JOIN children c ON c.id = a.child_id
     WHERE a.status IN ('scheduled', 'confirmed', 'reschedule_requested')
       AND a.scheduled_at >= now()
       AND a.scheduled_at <= now() + ($1::int * INTERVAL '1 day')
       AND NOT EXISTS (
         SELECT 1
         FROM notifications n
         WHERE n.user_id = a.parent_id
           AND n.child_id = a.child_id
           AND n.category = 'appointment_reminder'
           AND n.action_url = '/appointments/' || a.id::text
       )
     ORDER BY a.scheduled_at ASC`,
    [days],
  );

  const notifications = [];
  for (const appointment of appointments) {
    const notification = await notifyAppointmentReminder({
      parentId: appointment.parent_id,
      childId: appointment.child_id,
      childName: appointment.child_name,
      type: appointment.type,
      scheduledAt: appointment.scheduled_at,
      location: appointment.location,
      appointmentId: appointment.id,
    });
    notifications.push(notification);
  }

  await audit(req.user.id, 'create', 'appointment_reminders', null, { days, count: notifications.length });
  res.json({ sent: notifications.length, notifications });
}
