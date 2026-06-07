import bcrypt from 'bcryptjs';
import { pool, query } from './pool.js';

async function upsertUser({ name, email, password, role, phone, municipality, address }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const { rows } = await query(
    `INSERT INTO users (name, email, password_hash, role, phone, municipality, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       phone = COALESCE(EXCLUDED.phone, users.phone),
       municipality = COALESCE(EXCLUDED.municipality, users.municipality),
       address = COALESCE(EXCLUDED.address, users.address)
     RETURNING id, email, role`,
    [name, email, passwordHash, role, phone || null, municipality || null, address || null],
  );
  return rows[0];
}

async function seed() {
  const parent = await upsertUser({
    name: 'Arta Krasniqi',
    email: 'parent@safe.test',
    password: 'Password123!',
    role: 'parent',
    phone: '+383 44 512 788',
    municipality: 'Pristina',
    address: 'Rruga Dardania 14',
  });

  const doctor = await upsertUser({
    name: 'Mirela Berisha',
    email: 'doctor@safe.test',
    password: 'Password123!',
    role: 'doctor',
    phone: '+383 44 221 100',
    municipality: 'Pristina',
    address: 'Klinika Familjare, Pristina',
  });

  const admin = await upsertUser({
    name: 'Burim Hoxha',
    email: 'admin@safe.test',
    password: 'Password123!',
    role: 'admin',
    phone: '+383 44 999 001',
    municipality: 'Pristina',
    address: 'Ministry of Health, Pristina',
  });

  const municipality = await upsertUser({
    name: 'Vjosa Gashi',
    email: 'municipality@safe.test',
    password: 'Password123!',
    role: 'municipality',
    phone: '+383 44 301 451',
    municipality: 'Prizren',
    address: 'Municipality Office, Prizren',
  });

  // Child for parent
  const { rows: children } = await query(
    `INSERT INTO children (full_name, date_of_birth, gender, parent_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    ['Aria Krasniqi', '2021-09-12', 'female', parent.id],
  );

  let childId;
  if (children.length > 0) {
    childId = children[0].id;
  } else {
    const { rows } = await query(`SELECT id FROM children WHERE parent_id = $1 LIMIT 1`, [parent.id]);
    childId = rows[0].id;
  }

  // Second child
  const { rows: children2 } = await query(
    `INSERT INTO children (full_name, date_of_birth, gender, parent_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    ['Luan Krasniqi', '2023-03-05', 'male', parent.id],
  );
  const child2Id = children2.length > 0 ? children2[0].id : null;

  // Care assignment: nurse → parent/child
  await query(
    `INSERT INTO care_assignments (parent_id, provider_id, child_id, relationship, notes)
     VALUES ($1, $2, $3, 'assigned_nurse', 'Demo family assigned to primary SAFE nurse.')
     ON CONFLICT (parent_id, provider_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid))
       WHERE status = 'active'
     DO NOTHING`,
    [parent.id, doctor.id, childId],
  );

  // Vaccinations for Aria
  await query(
    `INSERT INTO vaccinations (child_id, vaccine_name, recommended_date, scheduled_date, completed_date, status)
     VALUES
       ($1, 'MMR', CURRENT_DATE + INTERVAL '10 days', CURRENT_DATE + INTERVAL '10 days', null, 'pending'),
       ($1, 'DTaP booster', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '14 days', null, 'missed'),
       ($1, 'Influenza', CURRENT_DATE - INTERVAL '40 days', CURRENT_DATE - INTERVAL '35 days', CURRENT_DATE - INTERVAL '5 days', 'delayed'),
       ($1, 'Hepatitis B', CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE - INTERVAL '175 days', CURRENT_DATE - INTERVAL '170 days', 'completed'),
       ($1, 'Polio (OPV)', CURRENT_DATE - INTERVAL '300 days', CURRENT_DATE - INTERVAL '295 days', CURRENT_DATE - INTERVAL '290 days', 'completed')
     ON CONFLICT DO NOTHING`,
    [childId],
  );

  // Vaccinations for Luan
  if (child2Id) {
    await query(
      `INSERT INTO vaccinations (child_id, vaccine_name, recommended_date, scheduled_date, completed_date, status)
       VALUES
         ($1, 'Hepatitis B (birth dose)', CURRENT_DATE - INTERVAL '450 days', CURRENT_DATE - INTERVAL '450 days', CURRENT_DATE - INTERVAL '449 days', 'completed'),
         ($1, 'BCG', CURRENT_DATE - INTERVAL '448 days', CURRENT_DATE - INTERVAL '448 days', CURRENT_DATE - INTERVAL '447 days', 'completed'),
         ($1, 'DTaP (1st)', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '30 days', null, 'pending')
       ON CONFLICT DO NOTHING`,
      [child2Id],
    );
  }

  // Home visits for Aria
  await query(
    `INSERT INTO home_visits (
       child_id, nurse_id, scheduled_at, completed_at, status, visit_type, location,
       nutrition_notes, vaccination_notes, development_notes, environment_notes, risk_notes,
       weight_kg, height_cm, temperature
     )
     VALUES
       ($1, $2, now() - INTERVAL '18 days', now() - INTERVAL '18 days', 'completed', 'routine', 'Pristina Zone 3',
        'Healthy appetite and breastfeeding history reviewed.', 'MMR discussed with parent.', 'Age-appropriate communication.', 'Safe home environment.', null, 11.4, 83.0, 36.8),
       ($1, $2, now() + INTERVAL '5 days', null, 'scheduled', 'follow-up', 'Pristina Zone 3',
        null, null, null, null, null, null, null, null),
       ($1, $2, now() - INTERVAL '45 days', null, 'missed', 'dental follow-up', 'Pristina Zone 3',
        null, null, null, null, 'Family did not respond to two reminder attempts.', null, null, null)
     ON CONFLICT DO NOTHING`,
    [childId, doctor.id],
  );

  // Appointments
  await query(
    `INSERT INTO appointments (child_id, parent_id, provider_id, type, scheduled_at, location, notes, status)
     VALUES
       ($1, $2, $3, 'vaccination', now() + INTERVAL '10 days', 'Pristina Family Medicine Center', 'MMR vaccination appointment. Please bring the vaccination booklet if available.', 'scheduled'),
       ($1, $2, $3, 'dental', now() - INTERVAL '30 days', 'Dental Screening Unit', 'Dental screening needs to be rescheduled.', 'missed'),
       ($1, $2, $3, 'home_visit', now() + INTERVAL '5 days', 'Home visit - Pristina Zone 3', 'Routine home visiting follow-up with nurse.', 'scheduled')
     ON CONFLICT DO NOTHING`,
    [childId, parent.id, doctor.id],
  );

  // Messages
  await query(
    `INSERT INTO messages (child_id, sender_id, recipient_id, body)
     VALUES
       ($1, $2, $3, 'Your upcoming home visit is scheduled for next week. Please confirm availability.'),
       ($1, $3, $2, 'Confirmed. We will be home in the morning.'),
       ($1, $2, $3, 'Thank you. Please keep the vaccination booklet nearby if available.')
     ON CONFLICT DO NOTHING`,
    [childId, doctor.id, parent.id],
  );

  // Notifications
  await query(
    `INSERT INTO notifications (user_id, child_id, title, body, category, due_at)
     VALUES
       ($1, $2, 'MMR vaccination due soon', 'Aria has an MMR vaccination scheduled in the next 10 days.', 'vaccination', now() + INTERVAL '10 days'),
       ($1, $2, 'Dental screening overdue', 'A dental screening is overdue and should be rescheduled.', 'checkup', now() - INTERVAL '30 days'),
       ($3, $2, 'High-risk follow-up', 'Aria has missed preventive care and needs follow-up.', 'risk', now()),
       ($4, null, 'Municipality report ready', 'The weekly health coverage report for Prizren is available.', 'general', now())
     ON CONFLICT DO NOTHING`,
    [parent.id, childId, doctor.id, municipality.id],
  );

  // User settings for all four
  await query(
    `INSERT INTO user_settings (user_id, language, sms_notifications, push_notifications, email_notifications)
     VALUES
       ($1, 'sq', true, true, false),
       ($2, 'en', true, true, true),
       ($3, 'en', false, true, true),
       ($4, 'en', true, false, true)
     ON CONFLICT (user_id) DO NOTHING`,
    [parent.id, doctor.id, admin.id, municipality.id],
  );

  // Risk assessment
  await query(
    `INSERT INTO risk_assessments (child_id, score, level, reasons)
     VALUES ($1, 72, 'high', $2)
     ON CONFLICT DO NOTHING`,
    [childId, JSON.stringify(['Missed DTaP booster', 'Dental screening overdue', 'Missed home visit'])],
  );

  // Checkups
  await query(
    `INSERT INTO checkups (child_id, checkup_type, scheduled_date, completed_date, notes, status)
     VALUES
       ($1, 'Annual pediatric visit', CURRENT_DATE + INTERVAL '7 days', null, 'Routine growth and prevention visit.', 'pending'),
       ($1, 'Dental screening', CURRENT_DATE - INTERVAL '30 days', null, 'Needs reschedule.', 'missed')
     ON CONFLICT DO NOTHING`,
    [childId],
  );

  // Milestones
  await query(
    `INSERT INTO milestones (child_id, title, description, expected_date, achieved_date, status)
     VALUES
       ($1, 'Language development', 'Uses short sentences and follows simple instructions.', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '55 days', 'completed'),
       ($1, 'Fine motor skills', 'Copies simple shapes and stacks blocks.', CURRENT_DATE + INTERVAL '30 days', null, 'pending')
     ON CONFLICT DO NOTHING`,
    [childId],
  );

  console.log('\n✓ Seed complete. Demo accounts:\n');
  console.log('  parent@safe.test       — Parent (Arta Krasniqi)');
  console.log('  doctor@safe.test       — Doctor/Nurse (Mirela Berisha)');
  console.log('  admin@safe.test        — Admin (Burim Hoxha)');
  console.log('  municipality@safe.test — Municipality (Vjosa Gashi)');
  console.log('\n  All passwords: Password123!\n');
}

try {
  await seed();
} finally {
  await pool.end();
}
