/*
  # Add CC and BCC fields to emails table

  ## Summary
  Adds cc_address and bcc_address columns to the emails table to support
  CC and BCC recipients when composing and sending emails.

  ## Modified Tables

  ### emails
  - Added `cc_address` (text, default '') - comma-separated CC recipients
  - Added `bcc_address` (text, default '') - comma-separated BCC recipients

  ## Notes
  - Both columns default to empty string to maintain backwards compatibility
  - No RLS changes needed as existing policies cover all columns
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
