import { query } from '../db/pool.js';
import { createMessage, listUserMessages } from '../services/message.service.js';

export async function listMessages(req, res) {
  const messages = await listUserMessages(req.user.id, req.query.childId || null);
  res.json({ messages });
}

export async function sendMessage(req, res) {
  const { recipientId, childId, body } = req.body;
  const message = await createMessage({ sender: req.user, recipientId, childId: childId || null, body });
  req.app.get('io')?.to(`user:${recipientId}`).emit('message:new', message);
  req.app.get('io')?.to(`user:${req.user.id}`).emit('message:new', message);
  res.status(201).json({ message });
}

export async function markRead(req, res) {
  const { rows } = await query(
    `UPDATE messages SET read_at = now()
     WHERE id = $1 AND recipient_id = $2
     RETURNING *`,
    [req.params.messageId, req.user.id],
  );
  if (!rows[0]) {
    const error = new Error('Message not found');
    error.status = 404;
    throw error;
  }
  res.json({ message: rows[0] });
}
