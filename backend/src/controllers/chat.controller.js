import { query } from '../db/pool.js';
import { env } from '../config/env.js';

async function fetchParentContext(userId) {
  const childrenRes = await query(
    `SELECT c.id, c.full_name, c.date_of_birth, c.gender FROM children c WHERE c.parent_id = $1`,
    [userId]
  );
  const children = childrenRes.rows;

  if (children.length === 0) return { children: [] };

  const childIds = children.map((c) => c.id);
  const placeholders = childIds.map((_, i) => `$${i + 1}`).join(',');

  const vacRes = await query(
    `SELECT child_id, vaccine_name, recommended_date, scheduled_date, status
     FROM vaccinations WHERE child_id IN (${placeholders}) ORDER BY recommended_date`,
    childIds
  );

  const apptRes = await query(
    `SELECT child_id, type, scheduled_at, status, parent_response
     FROM appointments WHERE child_id IN (${placeholders}) ORDER BY scheduled_at`,
    childIds
  );

  const milestoneRes = await query(
    `SELECT child_id, title, expected_date, achieved_date, status
     FROM milestones WHERE child_id IN (${placeholders}) ORDER BY expected_date`,
    childIds
  );

  const riskRes = await query(
    `SELECT DISTINCT ON (child_id) child_id, score, level, reasons, generated_at
     FROM risk_assessments WHERE child_id IN (${placeholders})
     ORDER BY child_id, generated_at DESC`,
    childIds
  );

  const byChild = (rows, key = 'child_id') =>
    rows.reduce((acc, row) => {
      (acc[row[key]] = acc[row[key]] || []).push(row);
      return acc;
    }, {});

  const vaccines = byChild(vacRes.rows);
  const appointments = byChild(apptRes.rows);
  const milestones = byChild(milestoneRes.rows);
  const risks = byChild(riskRes.rows);

  return {
    children: children.map((c) => ({
      ...c,
      vaccinations: vaccines[c.id] || [],
      appointments: appointments[c.id] || [],
      milestones: milestones[c.id] || [],
      risk: risks[c.id]?.[0] || null,
    })),
  };
}

function buildSystemPrompt(parentName, context) {
  const today = new Date().toISOString().split('T')[0];
  const formatDate = (value, fallback = 'N/A') => {
    if (!value) return fallback;
    if (value instanceof Date) return value.toISOString().split('T')[0];
    return String(value).split('T')[0];
  };

  const childrenText = context.children.map((c) => {
    const dob = formatDate(c.date_of_birth, 'unknown');
    const ageMs = c.date_of_birth ? Date.now() - new Date(c.date_of_birth).getTime() : 0;
    const ageMonths = Math.floor(ageMs / (1000 * 60 * 60 * 24 * 30.44));

    const vaccines = c.vaccinations.map(
      (v) => `  - ${v.vaccine_name}: status=${v.status}, recommended=${formatDate(v.recommended_date)}, scheduled=${formatDate(v.scheduled_date)}`
    ).join('\n') || '  (none recorded)';

    const appts = c.appointments.map(
      (a) => `  - ${a.type} on ${formatDate(a.scheduled_at)}: status=${a.status}, parent_response=${a.parent_response || 'none'}`
    ).join('\n') || '  (none recorded)';

    const miles = c.milestones.map(
      (m) => `  - ${m.title}: expected=${formatDate(m.expected_date)}, achieved=${formatDate(m.achieved_date, 'not yet')}, status=${m.status}`
    ).join('\n') || '  (none recorded)';

    const risk = c.risk
      ? `Risk score: ${c.risk.score}/100 (${c.risk.level}). Reasons: ${JSON.stringify(c.risk.reasons)}`
      : 'No risk assessment yet';

    return `Child: ${c.full_name} (DOB: ${dob}, ~${ageMonths} months old, gender: ${c.gender})
Vaccinations:
${vaccines}
Appointments:
${appts}
Milestones:
${miles}
${risk}`;
  }).join('\n\n---\n\n');

  return `You are a friendly, helpful health assistant on the SAFE platform — a preventive child healthcare system in Kosovo. Today is ${today}.

You are speaking with ${parentName}, a parent. Here is the health data for their children:

${childrenText}

Guidelines:
- Answer questions about their children's vaccinations, appointments, milestones, and health status using the data above.
- Flag any missed or overdue vaccinations/appointments proactively if asked.
- Keep answers short, warm, and easy to understand — this is a parent, not a clinician.
- For medical emergencies, always advise them to call their nurse or visit the nearest clinic immediately.
- Do not make up data. If information is not in the context, say so honestly.
- Respond in the same language the parent uses (Albanian or English).`;
}

export async function chat(req, res) {
  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    const error = new Error('messages array is required');
    error.status = 400;
    throw error;
  }

  if (!env.groqApiKey) {
    const error = new Error('AI chat is not configured on this server');
    error.status = 503;
    throw error;
  }

  const context = await fetchParentContext(req.user.id);
  const systemPrompt = buildSystemPrompt(req.user.name, context);

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
        ...messages,
      ],
      stream: false,
    }),
  });

  if (!groqResponse.ok) {
    const body = await groqResponse.text();
    const error = new Error(`AI service error: ${body}`);
    error.status = 502;
    throw error;
  }

  const data = await groqResponse.json();
  const reply = data.choices?.[0]?.message?.content || '';
  res.json({ reply });
}
