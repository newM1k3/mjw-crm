/*
  # Create activities table

  ## Summary
  Adds an activities table to track recent user actions across all CRM entities.
  Used to power the activity feed on the Dashboard page.

  ## New Tables

  ### activities
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users) - owner of the activity
  - `type` (text) - one of: email, call, meeting, note, client_added, contact_added, tag_added, event_added
  - `title` (text) - short summary of the activity
  - `description` (text) - longer description
  - `entity_id` (uuid, nullable) - optional reference to a related record
  - `entity_type` (text, nullable) - type of the related record (client, contact, event, etc.)
  - `created_at` (timestamptz) - when the activity occurred

  ## Security
  - RLS enabled
  - Authenticated users can only select/insert/delete their own activities
*/

CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  entity_id uuid,
  entity_type text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own activities"
  ON activities FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON activities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON activities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON activities FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
