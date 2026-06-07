import { env } from '../config/env.js';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function groqClient() {
  if (!env.groqApiKey) {
    const error = new Error('AI analysis is not configured on this server. Add GROQ_API_KEY.');
    error.status = 503;
    throw error;
  }
  return env.groqApiKey;
}

function compactRows(rows, fields) {
  return rows.slice(0, 30).map((row) => {
    const item = {};
    for (const field of fields) {
      item[field] = row[field] ?? null;
    }
    return item;
  });
}

export function buildRiskPayload({ child, records, score, level, reasons }) {
  return {
    child: {
      id: child.id,
      fullName: child.full_name,
      dateOfBirth: child.date_of_birth,
      gender: child.gender,
      municipality: child.municipality,
    },
    ruleBasedRisk: { score, level, reasons },
    healthRecords: {
      vaccinations: compactRows(records.vaccinations, [
        'vaccine_name', 'recommended_date', 'scheduled_date', 'completed_date', 'status',
      ]),
      checkups: compactRows(records.checkups, [
        'checkup_type', 'scheduled_date', 'completed_date', 'notes', 'status',
      ]),
      milestones: compactRows(records.milestones, [
        'milestone_name', 'expected_age_months', 'achieved_date', 'notes', 'status',
      ]),
      appointments: compactRows(records.appointments, [
        'type', 'scheduled_at', 'location', 'status', 'parent_response', 'notes',
      ]),
      homeVisits: compactRows(records.visits, [
        'scheduled_at', 'completed_at', 'status', 'temperature',
        'weight_kg', 'height_cm', 'symptoms', 'risk_notes', 'risk_level',
      ]),
    },
  };
}

const systemPrompt =
  'You support SAFE, a preventive child health monitoring system in Kosovo. ' +
  'Use only the provided record data. Do not diagnose, prescribe medication, or replace clinical judgment. ' +
  'Flag preventive follow-up needs clearly and recommend provider review when risk is not low. ' +
  'Respond with ONLY valid JSON matching the exact schema requested — no markdown, no extra text.';

const responseShape = `{
  "summary": "string — clinical summary of the child's preventive care status",
  "keyReasons": ["string", "..."],
  "recommendedActions": ["string", "..."],
  "urgency": "routine | within_30_days | within_7_days | urgent",
  "parentFriendlyMessage": "string — warm, plain-language message for the parent",
  "providerNotes": "string — concise clinical notes for the assigned nurse"
}`;

export async function generateRiskInsight(payload) {
  const apiKey = groqClient();

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content:
            `Analyze this child's preventive-care record and return JSON matching this exact shape:\n${responseShape}\n\nRecord data:\n${JSON.stringify(payload)}`,
        },
      ],
      temperature: 0.2,
      stream: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Groq AI service error: ${body}`);
    error.status = 502;
    throw error;
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    const error = new Error('Groq did not return an analysis result.');
    error.status = 502;
    throw error;
  }

  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    const error = new Error('Groq response did not contain valid JSON.');
    error.status = 502;
    throw error;
  }

  return JSON.parse(jsonMatch[0]);
}

export { GROQ_MODEL };
