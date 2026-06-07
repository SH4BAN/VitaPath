import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { query } from '../db/pool.js';

function smtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function transporter() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

export async function queueEmail({ notificationId = null, userId = null, to, subject, body, html = null }) {
  const { rows } = await query(
    `INSERT INTO email_outbox (notification_id, user_id, to_email, subject, body, html)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [notificationId, userId, to, subject, body, html],
  );
  return rows[0];
}

export async function sendQueuedEmail(email) {
  if (!smtpConfigured()) {
    await query(
      `UPDATE email_outbox
       SET status = 'skipped',
           error = 'SMTP is not configured. Email is stored in outbox.',
           updated_at = now()
       WHERE id = $1`,
      [email.id],
    );
    return { status: 'skipped' };
  }

  try {
    const info = await transporter().sendMail({
      from: env.emailFrom,
      to: email.to_email,
      subject: email.subject,
      text: email.body,
      html: email.html || undefined,
    });
    await query(
      `UPDATE email_outbox
       SET status = 'sent',
           provider_message_id = $2,
           sent_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [email.id, info.messageId || null],
    );
    return { status: 'sent', messageId: info.messageId };
  } catch (error) {
    await query(
      `UPDATE email_outbox
       SET status = 'failed',
           error = $2,
           updated_at = now()
       WHERE id = $1`,
      [email.id, error.message],
    );
    return { status: 'failed', error: error.message };
  }
}

export async function queueAndSendEmail(payload) {
  const email = await queueEmail(payload);
  await sendQueuedEmail(email);
  return email;
}
