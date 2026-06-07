import { query } from '../db/pool.js';
import { getAccessibleChild, childFilterForUser } from '../services/access.service.js';
import { buildReminders } from '../services/reminder.service.js';
import { calculatePreventiveRiskScore, riskBand } from '../services/risk.service.js';
import { buildTimeline } from '../services/timeline.service.js';

async function childRecords(childId) {
  const [vaccinations, checkups, milestones, appointments, visits] = await Promise.all([
    query('SELECT * FROM vaccinations WHERE child_id = $1 ORDER BY recommended_date ASC', [childId]),
    query('SELECT * FROM checkups WHERE child_id = $1 ORDER BY scheduled_date ASC', [childId]),
    query('SELECT * FROM milestones WHERE child_id = $1 ORDER BY expected_date ASC', [childId]),
    query(`SELECT a.*, u.name AS provider_name FROM appointments a LEFT JOIN users u ON u.id = a.provider_id WHERE a.child_id = $1 ORDER BY a.scheduled_at ASC`, [childId]),
    query(`SELECT hv.*, u.name AS nurse_name FROM home_visits hv LEFT JOIN users u ON u.id = hv.nurse_id WHERE hv.child_id = $1 ORDER BY hv.scheduled_at ASC`, [childId]),
  ]);
  return {
    vaccinations: vaccinations.rows,
    checkups: checkups.rows,
    milestones: milestones.rows,
    appointments: appointments.rows,
    visits: visits.rows,
  };
}

export async function parentOverview(req, res) {
  const filter = childFilterForUser(req.user);
  const { rows: children } = await query(`SELECT c.* FROM children c ${filter.where} ORDER BY c.full_name`, filter.params);
  const childSummaries = [];

  for (const child of children) {
    const records = await childRecords(child.id);
    const riskScore = calculatePreventiveRiskScore(records);
    const reminders = buildReminders(records);
    childSummaries.push({
      child,
      riskScore,
      riskBand: riskBand(riskScore),
      upcomingCount: reminders.filter((item) => item.severity === 'upcoming').length,
      overdueCount: reminders.filter((item) => item.severity !== 'upcoming').length,
      vaccinationCount: records.vaccinations.length,
      checkupCount: records.checkups.length,
      milestoneCount: records.milestones.length,
    });
  }

  res.json({
    overview: {
      childrenCount: children.length,
      highRiskChildren: childSummaries.filter((summary) => summary.riskBand === 'high').length,
      children: childSummaries,
    },
  });
}

export async function childTimeline(req, res) {
  const child = await getAccessibleChild(req.params.childId, req.user);
  const records = await childRecords(child.id);
  res.json({
    child,
    timeline: buildTimeline(records),
    riskScore: calculatePreventiveRiskScore(records),
    riskBand: riskBand(calculatePreventiveRiskScore(records)),
  });
}

export async function upcomingReminders(req, res) {
  const filter = childFilterForUser(req.user);
  const { rows: children } = await query(`SELECT c.* FROM children c ${filter.where}`, filter.params);
  const reminders = [];
  for (const child of children) {
    const records = await childRecords(child.id);
    reminders.push(...buildReminders(records).map((item) => ({ ...item, child })));
  }
  res.json({ reminders: reminders.filter((item) => item.severity === 'upcoming') });
}

export async function missedActions(req, res) {
  const filter = childFilterForUser(req.user);
  const { rows: children } = await query(`SELECT c.* FROM children c ${filter.where}`, filter.params);
  const actions = [];
  for (const child of children) {
    const records = await childRecords(child.id);
    actions.push(...buildReminders(records).filter((item) => item.severity !== 'upcoming').map((item) => ({ ...item, child })));
  }
  res.json({ missedActions: actions });
}

export async function providerStats(_req, res) {
  const { rows } = await query(`
    SELECT
      (SELECT count(*)::int FROM children) AS children_count,
      (SELECT count(*)::int FROM users WHERE role = 'parent') AS parents_count,
      (SELECT count(*)::int FROM vaccinations WHERE status IN ('missed', 'delayed')) AS vaccination_gaps,
      (SELECT count(*)::int FROM checkups WHERE status IN ('missed', 'delayed')) AS checkup_gaps,
      (SELECT count(*)::int FROM home_visits) AS home_visits_count,
      (SELECT count(*)::int FROM home_visits WHERE status = 'completed') AS completed_home_visits,
      (SELECT count(*)::int FROM home_visits WHERE status = 'missed') AS missed_home_visits,
      (SELECT count(*)::int FROM vaccinations WHERE status = 'pending' AND COALESCE(scheduled_date, recommended_date) < CURRENT_DATE) AS overdue_vaccinations,
      (SELECT count(*)::int FROM checkups WHERE status = 'pending' AND scheduled_date < CURRENT_DATE) AS overdue_checkups
  `);
  res.json({ stats: rows[0] });
}
