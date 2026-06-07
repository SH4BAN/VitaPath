import { query } from '../db/pool.js';
import { assertParentProviderLinked } from './access.service.js';
import { audit } from './audit.service.js';

export async function listUserMessages(userId, childId = null) {
  const params = [userId];
  const clauses = ['(m.sender_id = $1 OR m.recipient_id = $1)'];
  if (childId) {
    params.push(childId);
    clauses.push(`m.child_id = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT m.*,
            sender.name AS sender_name,
            sender.role AS sender_role,
            recipient.name AS recipient_name,
            recipient.role AS recipient_role,
            c.full_name AS child_name
     FROM messages m
     JOIN users sender ON sender.id = m.sender_id
     JOIN users recipient ON recipient.id = m.recipient_id
     LEFT JOIN children c ON c.id = m.child_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY m.created_at ASC`,
    params,
  );
  return rows;
}

export async function validateMessagePermission(sender, recipientId, childId = null) {
  const { rows: recipients } = await query('SELECT id, role FROM users WHERE id = $1', [recipientId]);
  const recipient = recipients[0];
  if (!recipient) {
    const error = new Error('Recipient not found');
    error.status = 404;
    throw error;
  }

  const adminSupport = sender.role === 'admin' || recipient.role === 'admin';
  if (adminSupport) return recipient;

  if (sender.role === 'parent' && recipient.role === 'doctor') {
    await assertParentProviderLinked(sender.id, recipientId, childId);
    return recipient;
  }
  if (sender.role === 'doctor' && recipient.role === 'parent') {
    await assertParentProviderLinked(recipientId, sender.id, childId);
    return recipient;
  }

  const error = new Error('Messages are only allowed between assigned parents/providers or with admin support');
  error.status = 403;
  throw error;
}

export async function createMessage({ sender, recipientId, childId = null, body }) {
  await validateMessagePermission(sender, recipientId, childId);
  const { rows } = await query(
    `INSERT INTO messages (sender_id, recipient_id, child_id, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [sender.id, recipientId, childId || null, body],
  );
  await audit(sender.id, 'create', 'message', rows[0].id, { recipientId, childId });
  const created = (await query(
    `SELECT m.*,
            sender.name AS sender_name,
            sender.role AS sender_role,
            recipient.name AS recipient_name,
            recipient.role AS recipient_role,
            c.full_name AS child_name
     FROM messages m
     JOIN users sender ON sender.id = m.sender_id
     JOIN users recipient ON recipient.id = m.recipient_id
     LEFT JOIN children c ON c.id = m.child_id
     WHERE m.id = $1`,
    [rows[0].id],
  )).rows[0];
  return created || rows[0];
}
