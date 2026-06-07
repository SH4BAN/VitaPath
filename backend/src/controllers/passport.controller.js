import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { env } from '../config/env.js';
import { getAccessibleChild } from '../services/access.service.js';

async function buildPassportData(childId) {
  const childRes = await query(
    `SELECT c.*, u.name AS parent_name, u.phone AS parent_phone, u.municipality
     FROM children c JOIN users u ON u.id = c.parent_id
     WHERE c.id = $1`,
    [childId],
  );
  const child = childRes.rows[0];
  if (!child) {
    const error = new Error('Child not found');
    error.status = 404;
    throw error;
  }

  const [vacRes, checkupRes, milestoneRes, visitRes, apptRes, riskRes] = await Promise.all([
    query(`SELECT * FROM vaccinations WHERE child_id = $1 ORDER BY recommended_date`, [childId]),
    query(`SELECT * FROM checkups WHERE child_id = $1 ORDER BY scheduled_date`, [childId]),
    query(`SELECT * FROM milestones WHERE child_id = $1 ORDER BY expected_date`, [childId]),
    query(
      `SELECT hv.*, u.name AS nurse_name FROM home_visits hv
       LEFT JOIN users u ON u.id = hv.nurse_id
       WHERE hv.child_id = $1 ORDER BY hv.completed_at DESC NULLS LAST LIMIT 10`,
      [childId],
    ),
    query(
      `SELECT * FROM appointments WHERE child_id = $1 ORDER BY scheduled_at DESC LIMIT 10`,
      [childId],
    ),
    query(
      `SELECT * FROM risk_assessments WHERE child_id = $1 ORDER BY generated_at DESC LIMIT 1`,
      [childId],
    ),
  ]);

  return {
    child,
    vaccinations: vacRes.rows,
    checkups: checkupRes.rows,
    milestones: milestoneRes.rows,
    recentVisits: visitRes.rows,
    appointments: apptRes.rows,
    risk: riskRes.rows[0] || null,
  };
}

export async function getPassport(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  const data = await buildPassportData(req.params.childId);
  res.json({ passport: data });
}

export async function generatePassportToken(req, res) {
  await getAccessibleChild(req.params.childId, req.user);
  // Short-lived signed token (15 min) embedded in QR — no DB dependency
  const token = jwt.sign(
    { sub: req.params.childId, type: 'passport' },
    env.jwtSecret,
    { expiresIn: '15m' },
  );
  res.json({ token });
}

export async function verifyPassport(req, res) {
  const { token } = req.query;
  if (!token) {
    const error = new Error('token query param is required');
    error.status = 400;
    throw error;
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    const error = new Error('QR code is expired or invalid. Ask the parent to generate a new one.');
    error.status = 401;
    throw error;
  }

  if (payload.type !== 'passport') {
    const error = new Error('Invalid token type');
    error.status = 400;
    throw error;
  }

  const data = await buildPassportData(payload.sub);
  res.json({ passport: data, scannedAt: new Date().toISOString() });
}
