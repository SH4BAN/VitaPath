import { query } from '../db/pool.js';
import { audit } from '../services/audit.service.js';

export async function getSettings(req, res) {
  const { rows } = await query(
    `INSERT INTO user_settings (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING *`,
    [req.user.id],
  );
  if (rows[0]) return res.json({ settings: rows[0] });

  const existing = await query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
  res.json({ settings: existing.rows[0] });
}

export async function updateSettings(req, res) {
  const {
    language,
    smsNotifications,
    pushNotifications,
    emailNotifications,
    reminderNotifications,
    consentMohDataSharing,
    consentResearchAnonymized,
    consentAssignedProvider,
    consentAiAnalysis,
  } = req.body;

  const { rows } = await query(
    `INSERT INTO user_settings (
       user_id, language, sms_notifications, push_notifications, email_notifications,
       reminder_notifications, consent_moh_data_sharing, consent_research_anonymized,
       consent_assigned_provider, consent_ai_analysis
     )
     VALUES ($1, COALESCE($2, 'en'), COALESCE($3, true), COALESCE($4, true), COALESCE($5, false),
       COALESCE($6, true), COALESCE($7, true), COALESCE($8, true), COALESCE($9, true), COALESCE($10, true))
     ON CONFLICT (user_id) DO UPDATE SET
       language = COALESCE($2, user_settings.language),
       sms_notifications = COALESCE($3, user_settings.sms_notifications),
       push_notifications = COALESCE($4, user_settings.push_notifications),
       email_notifications = COALESCE($5, user_settings.email_notifications),
       reminder_notifications = COALESCE($6, user_settings.reminder_notifications),
       consent_moh_data_sharing = COALESCE($7, user_settings.consent_moh_data_sharing),
       consent_research_anonymized = COALESCE($8, user_settings.consent_research_anonymized),
       consent_assigned_provider = COALESCE($9, user_settings.consent_assigned_provider),
       consent_ai_analysis = COALESCE($10, user_settings.consent_ai_analysis),
       updated_at = now()
     RETURNING *`,
    [
      req.user.id,
      language,
      smsNotifications,
      pushNotifications,
      emailNotifications,
      reminderNotifications,
      consentMohDataSharing,
      consentResearchAnonymized,
      consentAssignedProvider,
      consentAiAnalysis,
    ],
  );
  await audit(req.user.id, 'update', 'settings', req.user.id, {});
  res.json({ settings: rows[0] });
}
