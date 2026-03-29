/*
  # Add hex color support to tags table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tags' AND column_name = 'color'
  ) THEN
    ALTER TABLE tags ADD COLUMN color text NOT NULL DEFAULT '#3B82F6';
  END IF;
END $$;
