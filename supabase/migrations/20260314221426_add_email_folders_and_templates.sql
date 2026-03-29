/*
  # Add Email Folders and Email Templates

  ## Summary
  This migration adds folder support to the emails table (Inbox, Sent, Drafts, Trash)
  and creates a new email_templates table for storing reusable email templates.

  ## Modified Tables

  ### emails
  - Added `folder` (text, default 'inbox') - one of: inbox, sent, drafts, trash
  - Added `html_content` (text, default '') - rich text HTML version of the email body
  - Added `reply_to_id` (uuid, nullable) - references the email being replied to
  - Added `forward_of_id` (uuid, nullable) - references the email being forwarded

  ## New Tables

  ### email_templates
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users)
  - `name` (text) - short descriptive name for the template
  - `subject` (text) - default subject line
  - `html_content` (text) - rich text HTML body
  - `plain_content` (text) - plain text fallback
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - RLS enabled on email_templates
  - Policies allow authenticated users to manage only their own templates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'folder'
  ) THEN
    ALTER TABLE emails ADD COLUMN folder text NOT NULL DEFAULT 'inbox';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'html_content'
  ) THEN
    ALTER TABLE emails ADD COLUMN html_content text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE emails ADD COLUMN reply_to_id uuid REFERENCES emails(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'forward_of_id'
  ) THEN
    ALTER TABLE emails ADD COLUMN forward_of_id uuid REFERENCES emails(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE emails SET folder = 'sent' WHERE labels @> ARRAY['Sent'] AND folder = 'inbox';

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  html_content text NOT NULL DEFAULT '',
  plain_content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own templates"
  ON email_templates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates"
  ON email_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates"
  ON email_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON email_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_folder ON emails(folder);
