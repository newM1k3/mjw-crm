/*
  # Create Notes Table

  ## Summary
  Adds a `notes` table for attaching timestamped text notes to either a client or a contact.

  ## New Tables
  - `notes`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK → auth.users) — owner of the note
    - `entity_id` (uuid) — the ID of the client or contact this note belongs to
    - `entity_type` (text) — either 'client' or 'contact'
    - `content` (text) — the note body
    - `created_at` (timestamptz) — when the note was created

  ## Security
  - RLS enabled; users can only access their own notes
  - Separate SELECT, INSERT, UPDATE, DELETE policies

  ## Indexes
  - Index on (user_id, entity_id, entity_type) for efficient panel lookups
*/

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('client', 'contact')),
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_lookup_idx ON notes (user_id, entity_id, entity_type);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notes"
  ON notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
