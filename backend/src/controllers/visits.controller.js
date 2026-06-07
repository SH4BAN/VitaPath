import { query } from '../db/pool.js';
import { getAccessibleChild } from '../services/access.service.js';
import { audit } from '../services/audit.service.js';
import { notifyAppointmentScheduled, notifyUserWithEmail } from '../services/notification.service.js';

export async function listVisits(req, res) {
  const params = [];
  const clauses = [];

  if (req.user.role === 'parent') {
    params.push(req.user.id);
    clauses.push(`c.parent_id = $${params.length}`);
  }
  if (req.user.role === 'doctor') {
    params.push(req.user.id);
    clauses.push(`(
      hv.nurse_id = $${params.length}
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
  if (req.query.childId) {
    params.push(req.query.childId);
    clauses.push(`hv.child_id = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT hv.*, c.full_name AS child_name, c.date_of_birth,
            parent.name AS parent_name, parent.email AS parent_email,
            u.name AS nurse_name
     FROM home_visits hv
     JOIN children c ON c.id = hv.child_id
     JOIN users parent ON parent.id = c.parent_id
     LEFT JOIN users u ON u.id = hv.nurse_id
     ${where}
     ORDER BY hv.scheduled_at ASC`,
    params,
  );
  res.json({ visits: rows });
}

export async function createVisit(req, res) {
  const { childId, nurseId, scheduledAt, visitType, location } = req.body;
  await getAccessibleChild(childId, req.user);
  const assignedNurse = req.user.role === 'doctor' ? req.user.id : nurseId || null;
  const { rows } = await query(
    `INSERT INTO home_visits (child_id, nurse_id, scheduled_at, visit_type, location)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [childId, assignedNurse, scheduledAt, visitType || 'routine', location || null],
  );
  await notifyUserWithEmail({
    userId: (await query('SELECT parent_id FROM children WHERE id = $1', [childId])).rows[0].parent_id,
    childId,
    title: 'Home visit scheduled',
    body: `A home visit was scheduled for ${new Date(scheduledAt).toLocaleString('en-GB')}.${location ? ` Location: ${location}.` : ''}`,
    category: 'home_visit',
    dueAt: scheduledAt,
    actionUrl: `/visits/${rows[0].id}`,
    emailSubject: 'SAFE home visit scheduled',
  });
  await audit(req.user.id, 'create', 'home_visit', rows[0].id, { childId });
  res.status(201).json({ visit: rows[0] });
}

export async function updateVisit(req, res) {
  const { visitId } = req.params;
  const {
    status,
    completedAt,
    nutritionNotes,
    vaccinationNotes,
    developmentNotes,
    environmentNotes,
    riskNotes,
    temperature,
    weightKg,
    heightCm,
    symptoms,
    recommendedActions,
    riskLevel,
    nextVisitAt,
    followUpAppointment,
    offlineClientId,
  } = req.body;
  const { rows: visits } = await query('SELECT * FROM home_visits WHERE id = $1', [visitId]);
  const visit = visits[0];
  if (!visit) {
    const error = new Error('Visit not found');
    error.status = 404;
    throw error;
  }
  const child = await getAccessibleChild(visit.child_id, req.user);

  let followUpAppointmentId = null;
  if (followUpAppointment?.scheduledAt && followUpAppointment?.type) {
    const { rows: appointments } = await query(
      `INSERT INTO appointments (child_id, parent_id, provider_id, type, scheduled_at, location, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        child.id,
        child.parent_id,
        req.user.role === 'doctor' ? req.user.id : visit.nurse_id,
        followUpAppointment.type,
        followUpAppointment.scheduledAt,
        followUpAppointment.location || visit.location || null,
        followUpAppointment.notes || 'Created from home visit follow-up actions.',
      ],
    );
    followUpAppointmentId = appointments[0].id;
    await notifyAppointmentScheduled({
      parentId: child.parent_id,
      childId: child.id,
      childName: child.full_name,
      type: appointments[0].type,
      scheduledAt: appointments[0].scheduled_at,
      location: appointments[0].location,
      appointmentId: appointments[0].id,
    });
  }

  const { rows } = await query(
    `UPDATE home_visits
     SET status = COALESCE($1::visit_status, status),
         completed_at = COALESCE($2::timestamptz, completed_at),
         nutrition_notes = COALESCE($3, nutrition_notes),
         vaccination_notes = COALESCE($4, vaccination_notes),
         development_notes = COALESCE($5, development_notes),
         environment_notes = COALESCE($6, environment_notes),
         risk_notes = COALESCE($7, risk_notes),
         temperature = COALESCE($8::numeric, temperature),
         weight_kg = COALESCE($9::numeric, weight_kg),
         height_cm = COALESCE($10::numeric, height_cm),
         symptoms = COALESCE($11, symptoms),
         recommended_actions = COALESCE($12::jsonb, recommended_actions),
         risk_level = COALESCE($13::risk_level, risk_level),
         next_visit_at = COALESCE($14::timestamptz, next_visit_at),
         follow_up_appointment_id = COALESCE($15::uuid, follow_up_appointment_id),
         offline_client_id = COALESCE($16, offline_client_id),
         synced_at = now(),
         updated_at = now()
     WHERE id = $17
     RETURNING *`,
    [
      status,
      completedAt,
      nutritionNotes,
      vaccinationNotes,
      developmentNotes,
      environmentNotes,
      riskNotes,
      temperature,
      weightKg,
      heightCm,
      symptoms,
      recommendedActions ? JSON.stringify(recommendedActions) : null,
      riskLevel,
      nextVisitAt,
      followUpAppointmentId,
      offlineClientId,
      visitId,
    ],
  );
  if (status === 'completed') {
    await notifyUserWithEmail({
      userId: child.parent_id,
      childId: child.id,
      title: 'Home visit completed',
      body: `${child.full_name}'s home visit has been completed. The care team recorded notes and follow-up actions in SAFE.`,
      category: 'home_visit',
      actionUrl: `/visits/${visitId}`,
      emailSubject: `SAFE home visit completed: ${child.full_name}`,
    });
  }
  await audit(req.user.id, 'update', 'home_visit', visitId, { status });
  res.json({ visit: rows[0] });
}

export async function monthlyReport(req, res) {
  const { rows } = await query(
    `SELECT
       date_trunc('month', hv.scheduled_at)::date AS month,
       count(*)::int AS total_visits,
       count(*) FILTER (WHERE hv.status = 'completed')::int AS completed_visits,
       count(*) FILTER (WHERE hv.status = 'missed')::int AS missed_visits,
       count(DISTINCT hv.child_id)::int AS children_reached
     FROM home_visits hv
     GROUP BY 1
     ORDER BY 1 DESC
     LIMIT 12`,
  );
  res.json({ report: rows });
}
