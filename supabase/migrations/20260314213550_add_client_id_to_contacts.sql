/*
  # Add client_id to contacts

  ## Summary
  Creates a relationship between contacts and clients by adding a nullable
  foreign key column `client_id` to the `contacts` table.

  ## Changes

  ### Modified Tables
  - `contacts`
    - Added `client_id` (uuid, nullable) — references `clients(id)` with ON DELETE SET NULL
      so that deleting a client does not delete its linked contacts, only clears the link.

  ## Notes
  1. The column is nullable — contacts do not need to be associated with a client.
  2. An index is added on `client_id` to make lookups fast.
  3. No RLS changes needed — existing policies already cover all rows owned by the user.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE contacts ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);
