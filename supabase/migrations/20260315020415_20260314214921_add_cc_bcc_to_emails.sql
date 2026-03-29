/*
  # Add CC and BCC fields to emails table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'cc_address'
  ) THEN
    ALTER TABLE emails ADD COLUMN cc_address text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emails' AND column_name = 'bcc_address'
  ) THEN
    ALTER TABLE emails ADD COLUMN bcc_address text NOT NULL DEFAULT '';
  END IF;
END $$;
