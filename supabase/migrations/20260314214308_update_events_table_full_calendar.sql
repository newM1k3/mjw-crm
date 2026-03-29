/*
  # Update events table for full calendar functionality

  ## Summary
  Enhances the events table to support proper start/end times, client and contact
  associations, and a description field. Existing columns are preserved.

  ## Changes

  ### Modified Table: events
  - Added `start_time` (time, nullable) — event start time (HH:MM)
  - Added `end_time` (time, nullable) — event end time (HH:MM)
  - Added `description` (text, nullable) — event notes/description
  - Added `client_id` (uuid, nullable) — FK to clients(id), SET NULL on delete
  - Added `contact_id` (uuid, nullable) — FK to contacts(id), SET NULL on delete

  ## Notes
  1. All new columns are nullable for backwards compatibility.
  2. Indexes added on client_id and contact_id for performance.
  3. Existing RLS policies are unaffected.
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
