CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('parent', 'doctor', 'admin', 'municipality');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'municipality';
EXCEPTION
  WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE child_gender AS ENUM ('female', 'male', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE care_status AS ENUM ('pending', 'completed', 'missed', 'delayed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE visit_status AS ENUM ('scheduled', 'in_progress', 'completed', 'missed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('unread', 'read', 'responded', 'dismissed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'moderate', 'high', 'critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM ('vaccination', 'checkup', 'home_visit', 'dental', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'reschedule_requested', 'cancelled', 'completed', 'missed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'parent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS municipality text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  gender child_gender NOT NULL,
  parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS care_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  relationship text NOT NULL DEFAULT 'assigned_nurse',
  status text NOT NULL DEFAULT 'active',
  assigned_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_assignments_status_check CHECK (status IN ('active', 'ended')),
  CONSTRAINT care_assignments_not_self CHECK (parent_id <> provider_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_care_assignments_unique_active_parent_provider_child
  ON care_assignments(parent_id, provider_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS vaccinations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  recommended_date date NOT NULL,
  scheduled_date date,
  completed_date date,
  status care_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checkups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  checkup_type text NOT NULL,
  scheduled_date date NOT NULL,
  completed_date date,
  notes text,
  status care_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS milestones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  expected_date date,
  achieved_date date,
  status care_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS home_visits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  nurse_id uuid REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  completed_at timestamptz,
  status visit_status NOT NULL DEFAULT 'scheduled',
  visit_type text NOT NULL DEFAULT 'routine',
  location text,
  nutrition_notes text,
  vaccination_notes text,
  development_notes text,
  environment_notes text,
  risk_notes text,
  temperature numeric(4,1),
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  symptoms text,
  recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level risk_level,
  next_visit_at timestamptz,
  follow_up_appointment_id uuid,
  offline_client_id text,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS temperature numeric(4,1);
ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS weight_kg numeric(5,2);
ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS height_cm numeric(5,2);
ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS symptoms text;
ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS risk_level risk_level;
ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS next_visit_at timestamptz;
ALTER TABLE home_visits ADD COLUMN IF NOT EXISTS follow_up_appointment_id uuid;

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES users(id) ON DELETE SET NULL,
  type appointment_type NOT NULL,
  scheduled_at timestamptz NOT NULL,
  location text,
  notes text,
  status appointment_status NOT NULL DEFAULT 'scheduled',
  parent_response text,
  requested_time timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  action_url text,
  status notification_status NOT NULL DEFAULT 'unread',
  due_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id uuid REFERENCES notifications(id) ON DELETE SET NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  html text,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_outbox_status_check CHECK (status IN ('queued', 'sent', 'failed', 'skipped'))
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  score int NOT NULL CHECK (score >= 0 AND score <= 100),
  level risk_level NOT NULL,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_summary text,
  ai_recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_urgency text,
  ai_model text,
  generated_by text NOT NULL DEFAULT 'rules',
  reviewed_by_provider_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS ai_recommended_actions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS ai_urgency text;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS ai_model text;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS generated_by text NOT NULL DEFAULT 'rules';
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS reviewed_by_provider_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE risk_assessments ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  language text NOT NULL DEFAULT 'en',
  sms_notifications boolean NOT NULL DEFAULT true,
  push_notifications boolean NOT NULL DEFAULT true,
  email_notifications boolean NOT NULL DEFAULT false,
  reminder_notifications boolean NOT NULL DEFAULT true,
  consent_moh_data_sharing boolean NOT NULL DEFAULT true,
  consent_research_anonymized boolean NOT NULL DEFAULT true,
  consent_assigned_provider boolean NOT NULL DEFAULT true,
  consent_ai_analysis boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_children_parent ON children(parent_id);
CREATE INDEX IF NOT EXISTS idx_care_assignments_parent ON care_assignments(parent_id, status);
CREATE INDEX IF NOT EXISTS idx_care_assignments_provider ON care_assignments(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_care_assignments_child ON care_assignments(child_id, status);
CREATE INDEX IF NOT EXISTS idx_vaccinations_child ON vaccinations(child_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_status_date ON vaccinations(status, scheduled_date, recommended_date);
CREATE INDEX IF NOT EXISTS idx_checkups_child ON checkups(child_id);
CREATE INDEX IF NOT EXISTS idx_checkups_status_date ON checkups(status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_milestones_child ON milestones(child_id);
CREATE INDEX IF NOT EXISTS idx_home_visits_child ON home_visits(child_id);
CREATE INDEX IF NOT EXISTS idx_home_visits_nurse_date ON home_visits(nurse_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_parent_date ON appointments(parent_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_provider_date ON appointments(provider_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_child ON appointments(child_id);
CREATE INDEX IF NOT EXISTS idx_messages_child ON messages(child_id);
CREATE INDEX IF NOT EXISTS idx_messages_users ON messages(sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_outbox_user ON email_outbox(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_child_date ON risk_assessments(child_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_date ON audit_logs(actor_id, created_at DESC);
