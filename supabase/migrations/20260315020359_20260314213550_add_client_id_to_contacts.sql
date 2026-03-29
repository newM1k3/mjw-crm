/*
  # Add client_id to contacts

  ## Summary
  Creates a relationship between contacts and clients by adding a nullable
  foreign key column `client_id` to the `contacts` table.
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
