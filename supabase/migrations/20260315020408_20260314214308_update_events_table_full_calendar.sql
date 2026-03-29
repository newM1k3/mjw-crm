/*
  # Update events table for full calendar functionality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE events ADD COLUMN start_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE events ADD COLUMN end_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'description'
  ) THEN
    ALTER TABLE events ADD COLUMN description text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE events ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE events ADD COLUMN contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_client_id ON events(client_id);
CREATE INDEX IF NOT EXISTS idx_events_contact_id ON events(contact_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
