/*
  # Create user_settings table

  ## Summary
  Creates a table to persist all user preferences across the Settings page tabs:
  Profile, Notifications, Security, Appearance, and Data & Privacy.
  Each user has exactly one settings row (upserted on save).

  ## New Tables

  ### user_settings
  - `id` (uuid, primary key)
  - `user_id` (uuid, unique FK to auth.users) — one row per user
  - `full_name` (text) — display name
  - `phone` (text)
  - `company` (text)
  - `address` (text)
  - `bio` (text)
  - `avatar_url` (text) — profile picture URL
  - `notif_email` (boolean) — email notifications enabled
  - `notif_push` (boolean) — push notifications enabled
  - `notif_client_updates` (boolean)
  - `notif_meeting_reminders` (boolean)
  - `notif_weekly_reports` (boolean)
  - `security_session_timeout` (text) — minutes as string
  - `security_password_expiry` (text)
  - `appearance_theme` (text) — 'light' | 'dark'
  - `appearance_density` (text) — 'comfortable' | 'compact'
  - `data_retention` (text) — '1year' | '2years' | '5years' | 'forever'
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can only read/write their own settings row
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  notif_email boolean NOT NULL DEFAULT true,
  notif_push boolean NOT NULL DEFAULT true,
  notif_client_updates boolean NOT NULL DEFAULT true,
  notif_meeting_reminders boolean NOT NULL DEFAULT true,
  notif_weekly_reports boolean NOT NULL DEFAULT false,
  security_session_timeout text NOT NULL DEFAULT '30',
  security_password_expiry text NOT NULL DEFAULT '90',
  appearance_theme text NOT NULL DEFAULT 'light',
  appearance_density text NOT NULL DEFAULT 'comfortable',
  data_retention text NOT NULL DEFAULT 'forever',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own settings"
  ON user_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
