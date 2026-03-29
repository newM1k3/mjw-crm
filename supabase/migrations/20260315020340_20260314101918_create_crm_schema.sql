/*
  # CRM Full Schema

  ## Summary
  Creates all tables required for the MJW Design CRM application, all scoped to the authenticated user via RLS.

  ## New Tables

  ### clients
  - id, user_id, name, email, phone, company, status, tags (text[]), last_contact, starred, created_at

  ### contacts
  - id, user_id, name, email, phone, company, position, location, starred, tags (text[]), created_at

  ### events
  - id, user_id, title, date, time, duration, type, attendees (text[]), location, description, created_at

  ### emails
  - id, user_id, from_address, to_address, subject, preview, content, date, read, starred, has_attachment, labels (text[]), created_at

  ### tags
  - id, user_id, name, color_key, description, count, created_date, created_at

  ## Security
  - RLS enabled on all tables
  - Each table has SELECT, INSERT, UPDATE, DELETE policies restricted to auth.uid() = user_id
*/

-- CLIENTS
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  tags text[] NOT NULL DEFAULT '{}',
  last_contact text NOT NULL DEFAULT '',
  starred boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own clients"
  ON clients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- CONTACTS
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  position text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  starred boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own contacts"
  ON contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- EVENTS
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  date text NOT NULL DEFAULT '',
  time text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'meeting',
  attendees text[] NOT NULL DEFAULT '{}',
  location text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own events"
  ON events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events"
  ON events FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
  ON events FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- EMAILS
CREATE TABLE IF NOT EXISTS emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_address text NOT NULL DEFAULT '',
  to_address text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  preview text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  date text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  starred boolean NOT NULL DEFAULT false,
  has_attachment boolean NOT NULL DEFAULT false,
  labels text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own emails"
  ON emails FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails"
  ON emails FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emails"
  ON emails FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own emails"
  ON emails FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- TAGS
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  color_key text NOT NULL DEFAULT 'blue',
  description text NOT NULL DEFAULT '',
  count integer NOT NULL DEFAULT 0,
  created_date text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own tags"
  ON tags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags"
  ON tags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags"
  ON tags FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags"
  ON tags FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
