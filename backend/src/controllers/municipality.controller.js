import { query } from '../db/pool.js';
import { env } from '../config/env.js';

function municipalityFilter(user) {
  // municipality role sees only their municipality; admin sees all
  if (user.role === 'municipality' && user.municipality) {
    return { clause: `AND u.municipality = $1`, params: [user.municipality] };
  }
  return { clause: '', params: [] };
}

export async function getOverview(req, res) {
  const { clause, params } = municipalityFilter(req.user);
  const p = (n) => `$${params.length + n}`;

  // Total children
  const childrenRes = await query(
    `SELECT COUNT(DISTINCT c.id)::int AS total
     FROM children c
     JOIN users u ON u.id = c.parent_id
     WHERE 1=1 ${clause}`,
    params,
  );

  // Vaccination coverage
  const vacRes = await query(
    `SELECT
       COUNT(*) FILTER (WHERE v.status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE v.status = 'missed')::int    AS missed,
       COUNT(*) FILTER (WHERE v.status = 'pending')::int   AS pending,
       COUNT(*) FILTER (WHERE v.status = 'delayed')::int   AS delayed,
       COUNT(*)::int AS total
     FROM vaccinations v
     JOIN children c ON c.id = v.child_id
     JOIN users u ON u.id = c.parent_id
     WHERE 1=1 ${clause}`,
    params,
  );

  // Checkup coverage
  const checkupRes = await query(
    `SELECT
       COUNT(*) FILTER (WHERE ck.status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE ck.status = 'missed')::int    AS missed,
       COUNT(*)::int AS total
     FROM checkups ck
     JOIN children c ON c.id = ck.child_id
     JOIN users u ON u.id = c.parent_id
     WHERE 1=1 ${clause}`,
    params,
  );

  // Risk distribution
  const riskRes = await query(
    `SELECT ra.level, COUNT(*)::int AS count
     FROM risk_assessments ra
     JOIN children c ON c.id = ra.child_id
     JOIN users u ON u.id = c.parent_id
     WHERE ra.id IN (
       SELECT DISTINCT ON (child_id) id FROM risk_assessments ORDER BY child_id, generated_at DESC
     ) ${clause}
     GROUP BY ra.level`,
    params,
  );

  // High-risk children
  const highRiskRes = await query(
    `SELECT DISTINCT ON (c.id)
       c.id, c.full_name, c.date_of_birth, u.municipality,
       ra.score, ra.level, ra.reasons, ra.generated_at,
       nurse.name AS assigned_nurse
     FROM risk_assessments ra
     JOIN children c ON c.id = ra.child_id
     JOIN users u ON u.id = c.parent_id
     LEFT JOIN care_assignments ca ON ca.parent_id = c.parent_id AND ca.status = 'active'
     LEFT JOIN users nurse ON nurse.id = ca.provider_id
     WHERE ra.level IN ('high','critical') ${clause}
     ORDER BY c.id, ra.generated_at DESC
     LIMIT 20`,
    params,
  );

  // Healthcare workers & workload
  const workersRes = await query(
    `SELECT
       nurse.id, nurse.name, nurse.email, nurse.municipality,
       COUNT(DISTINCT ca.parent_id)::int AS assigned_families,
       COUNT(DISTINCT hv.id) FILTER (WHERE hv.status = 'completed')::int AS visits_completed,
       COUNT(DISTINCT hv.id) FILTER (WHERE hv.status = 'scheduled')::int AS visits_pending
     FROM users nurse
     LEFT JOIN care_assignments ca ON ca.provider_id = nurse.id AND ca.status = 'active'
     LEFT JOIN home_visits hv ON hv.nurse_id = nurse.id
     WHERE nurse.role = 'doctor'
     ${clause.replace('u.municipality', 'nurse.municipality')}
     GROUP BY nurse.id, nurse.name, nurse.email, nurse.municipality
     ORDER BY assigned_families DESC`,
    params,
  );

  // Monthly vaccination trend (last 6 months)
  const trendRes = await query(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', v.completed_date), 'Mon') AS month,
       DATE_TRUNC('month', v.completed_date) AS month_date,
       COUNT(*) FILTER (WHERE v.status = 'completed')::int AS completed,
       COUNT(*) FILTER (WHERE v.status = 'missed')::int    AS missed
     FROM vaccinations v
     JOIN children c ON c.id = v.child_id
     JOIN users u ON u.id = c.parent_id
     WHERE v.completed_date >= NOW() - INTERVAL '6 months' ${clause}
     GROUP BY DATE_TRUNC('month', v.completed_date)
     ORDER BY month_date`,
    params,
  );

  // Overdue vaccinations
  const overdueRes = await query(
    `SELECT
       c.id AS child_id, c.full_name, u.municipality,
       v.vaccine_name, v.recommended_date,
       EXTRACT(DAY FROM NOW() - v.recommended_date)::int AS days_overdue,
       nurse.name AS assigned_nurse
     FROM vaccinations v
     JOIN children c ON c.id = v.child_id
     JOIN users u ON u.id = c.parent_id
     LEFT JOIN care_assignments ca ON ca.parent_id = c.parent_id AND ca.status = 'active'
     LEFT JOIN users nurse ON nurse.id = ca.provider_id
     WHERE v.status IN ('pending','delayed')
       AND v.recommended_date < NOW() ${clause}
     ORDER BY v.recommended_date ASC
     LIMIT 30`,
    params,
  );

  // Upcoming appointments count
  const apptRes = await query(
    `SELECT COUNT(*)::int AS upcoming
     FROM appointments a
     JOIN children c ON c.id = a.child_id
     JOIN users u ON u.id = c.parent_id
     WHERE a.status = 'scheduled' AND a.scheduled_at > NOW() ${clause}`,
    params,
  );

  const vac = vacRes.rows[0];
  const ck = checkupRes.rows[0];
  const vacCoverage = vac.total > 0 ? Math.round((vac.completed / vac.total) * 100) : 0;
  const checkupCoverage = ck.total > 0 ? Math.round((ck.completed / ck.total) * 100) : 0;

  res.json({
    overview: {
      totalChildren: childrenRes.rows[0].total,
      vaccinationCoverage: vacCoverage,
      vaccinations: vac,
      checkupCoverage,
      checkups: ck,
      upcomingAppointments: apptRes.rows[0].upcoming,
      riskDistribution: riskRes.rows,
      highRiskChildren: highRiskRes.rows,
      healthcareWorkers: workersRes.rows,
      vaccinationTrend: trendRes.rows,
      overdueVaccinations: overdueRes.rows,
      municipality: req.user.municipality || 'All Municipalities',
    },
  });
}

export async function generateReport(req, res) {
  if (!env.groqApiKey) {
    const error = new Error('AI report generation is not configured on this server');
    error.status = 503;
    throw error;
  }

  const { clause, params } = municipalityFilter(req.user);
  const municipalityName = req.user.municipality || 'All Municipalities';
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Gather all data needed for the report in parallel
  const [
    childrenRes, vacRes, checkupRes, riskRes,
    newRiskRes, resolvedRiskRes, overdueRes,
    workersRes, visitsRes, apptRes,
  ] = await Promise.all([
    // Total children
    query(`SELECT COUNT(DISTINCT c.id)::int AS total FROM children c JOIN users u ON u.id = c.parent_id WHERE 1=1 ${clause}`, params),

    // Vaccination stats
    query(`SELECT
      COUNT(*) FILTER (WHERE v.status='completed')::int AS completed,
      COUNT(*) FILTER (WHERE v.status='missed')::int AS missed,
      COUNT(*) FILTER (WHERE v.status='pending')::int AS pending,
      COUNT(*)::int AS total,
      ROUND(COUNT(*) FILTER (WHERE v.status='completed') * 100.0 / NULLIF(COUNT(*),0), 1) AS coverage_pct
      FROM vaccinations v JOIN children c ON c.id=v.child_id JOIN users u ON u.id=c.parent_id WHERE 1=1 ${clause}`, params),

    // Checkup stats
    query(`SELECT
      COUNT(*) FILTER (WHERE ck.status='completed')::int AS completed,
      COUNT(*) FILTER (WHERE ck.status='missed')::int AS missed,
      COUNT(*)::int AS total
      FROM checkups ck JOIN children c ON c.id=ck.child_id JOIN users u ON u.id=c.parent_id WHERE 1=1 ${clause}`, params),

    // Current risk distribution
    query(`SELECT ra.level, COUNT(*)::int AS count FROM risk_assessments ra
      JOIN children c ON c.id=ra.child_id JOIN users u ON u.id=c.parent_id
      WHERE ra.id IN (SELECT DISTINCT ON (child_id) id FROM risk_assessments ORDER BY child_id, generated_at DESC) ${clause}
      GROUP BY ra.level ORDER BY ra.level`, params),

    // New high/critical risk this week
    query(`SELECT COUNT(*)::int AS count FROM risk_assessments ra
      JOIN children c ON c.id=ra.child_id JOIN users u ON u.id=c.parent_id
      WHERE ra.level IN ('high','critical') AND ra.generated_at >= $${params.length + 1} ${clause}`,
      [...params, weekAgo]),

    // Resolved (dropped from high to lower) this week
    query(`SELECT COUNT(DISTINCT ra.child_id)::int AS count FROM risk_assessments ra
      JOIN children c ON c.id=ra.child_id JOIN users u ON u.id=c.parent_id
      WHERE ra.level IN ('low','moderate') AND ra.generated_at >= $${params.length + 1}
      AND ra.child_id IN (
        SELECT DISTINCT child_id FROM risk_assessments
        WHERE level IN ('high','critical') AND generated_at < $${params.length + 1}
      ) ${clause}`,
      [...params, weekAgo]),

    // Overdue vaccinations count
    query(`SELECT COUNT(*)::int AS count FROM vaccinations v
      JOIN children c ON c.id=v.child_id JOIN users u ON u.id=c.parent_id
      WHERE v.status IN ('pending','delayed') AND v.recommended_date < NOW() ${clause}`, params),

    // Nurse workload summary
    query(`SELECT nurse.name,
      COUNT(DISTINCT ca.parent_id)::int AS families,
      COUNT(DISTINCT hv.id) FILTER (WHERE hv.status='completed' AND hv.completed_at >= $${params.length + 1})::int AS visits_this_week
      FROM users nurse
      LEFT JOIN care_assignments ca ON ca.provider_id=nurse.id AND ca.status='active'
      LEFT JOIN home_visits hv ON hv.nurse_id=nurse.id
      WHERE nurse.role='doctor' ${clause.replace('u.municipality','nurse.municipality')}
      GROUP BY nurse.id, nurse.name ORDER BY families DESC LIMIT 5`,
      [...params, weekAgo]),

    // Visits completed this week
    query(`SELECT COUNT(*)::int AS count FROM home_visits hv
      JOIN children c ON c.id=hv.child_id JOIN users u ON u.id=c.parent_id
      WHERE hv.status='completed' AND hv.completed_at >= $${params.length + 1} ${clause}`,
      [...params, weekAgo]),

    // Appointments this week
    query(`SELECT
      COUNT(*) FILTER (WHERE a.status='completed')::int AS completed,
      COUNT(*) FILTER (WHERE a.status='cancelled')::int AS cancelled,
      COUNT(*)::int AS total
      FROM appointments a JOIN children c ON c.id=a.child_id JOIN users u ON u.id=c.parent_id
      WHERE a.scheduled_at >= $${params.length + 1} ${clause}`,
      [...params, weekAgo]),
  ]);

  const vac = vacRes.rows[0];
  const ck = checkupRes.rows[0];
  const riskDist = riskRes.rows;
  const riskMap = Object.fromEntries(riskDist.map((r) => [r.level, r.count]));
  const totalRisk = riskDist.reduce((s, r) => s + r.count, 0);
  const highRiskPct = totalRisk > 0
    ? Math.round(((riskMap.high || 0) + (riskMap.critical || 0)) / totalRisk * 100)
    : 0;

  const weekStr = `${new Date(weekAgo).toLocaleDateString()} – ${new Date().toLocaleDateString()}`;
  const topNurse = workersRes.rows[0];

  // Build structured data context for Groq
  const dataContext = `
Municipality: ${municipalityName}
Report period: ${weekStr}

CHILDREN & COVERAGE
- Total registered children: ${childrenRes.rows[0].total}
- Vaccination coverage: ${vac.coverage_pct ?? 0}% (${vac.completed} completed, ${vac.missed} missed, ${vac.pending} pending out of ${vac.total})
- Check-up coverage: ${ck.total > 0 ? Math.round(ck.completed / ck.total * 100) : 0}% (${ck.completed} completed, ${ck.missed} missed)
- Overdue vaccinations this week: ${overdueRes.rows[0].count}

RISK STATUS
- Risk distribution: low=${riskMap.low || 0}, moderate=${riskMap.moderate || 0}, high=${riskMap.high || 0}, critical=${riskMap.critical || 0}
- High/critical children: ${highRiskPct}% of assessed
- New high/critical risk cases this week: ${newRiskRes.rows[0].count}
- Cases resolved (dropped to low/moderate) this week: ${resolvedRiskRes.rows[0].count}

HEALTHCARE ACTIVITY
- Home visits completed this week: ${visitsRes.rows[0].count}
- Appointments this week: ${apptRes.rows[0].completed} completed, ${apptRes.rows[0].cancelled} cancelled (total ${apptRes.rows[0].total})
- Top nurse: ${topNurse ? `${topNurse.name} (${topNurse.families} families, ${topNurse.visits_this_week} visits this week)` : 'N/A'}
- Active nurses: ${workersRes.rows.length}
`.trim();

  const systemPrompt = `You are a public health analyst generating an official weekly preventive child healthcare report for a municipality official in Kosovo.
Write in clear, professional English. Be specific with numbers. Highlight what improved, what worsened, and what requires immediate action.
Structure your response as JSON with this exact shape:
{
  "headline": "one sentence executive summary",
  "keyFindings": ["finding 1", "finding 2", "finding 3", "finding 4"],
  "riskSummary": "2-3 sentences on risk situation",
  "vaccinationSummary": "2-3 sentences on vaccination coverage",
  "workforceSummary": "1-2 sentences on healthcare worker activity",
  "urgentActions": ["action 1", "action 2", "action 3"],
  "trend": "improving | stable | deteriorating",
  "trendReason": "one sentence explaining the trend"
}
Return ONLY valid JSON, no markdown, no extra text.`;

  const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.groqApiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate the weekly report from this data:\n\n${dataContext}` },
      ],
      temperature: 0.3,
      stream: false,
    }),
  });

  if (!groqResponse.ok) {
    const body = await groqResponse.text();
    const error = new Error(`AI service error: ${body}`);
    error.status = 502;
    throw error;
  }

  const groqData = await groqResponse.json();
  const rawContent = groqData.choices?.[0]?.message?.content || '{}';

  let report;
  try {
    report = JSON.parse(rawContent);
  } catch {
    report = { headline: rawContent, keyFindings: [], urgentActions: [], trend: 'stable' };
  }

  res.json({
    report,
    meta: {
      municipality: municipalityName,
      generatedAt: new Date().toISOString(),
      period: weekStr,
      dataSnapshot: {
        totalChildren: childrenRes.rows[0].total,
        vaccinationCoverage: Number(vac.coverage_pct ?? 0),
        overdueVaccinations: overdueRes.rows[0].count,
        newHighRisk: newRiskRes.rows[0].count,
        resolvedCases: resolvedRiskRes.rows[0].count,
        visitsThisWeek: visitsRes.rows[0].count,
      },
    },
  });
}
