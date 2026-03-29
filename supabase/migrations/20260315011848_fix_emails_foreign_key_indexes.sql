/*
  # Add Missing Foreign Key Indexes on emails Table

  ## Summary
  The emails table has two foreign keys without covering indexes, which causes
  full table scans when Postgres needs to find related rows (e.g., cascade deletes,
  referential integrity checks, or join queries).

  ## Changes
  - Added index on emails.forward_of_id (covers emails_forward_of_id_fkey)
  - Added index on emails.reply_to_id (covers emails_reply_to_id_fkey)
*/

CREATE INDEX IF NOT EXISTS idx_emails_forward_of_id ON public.emails (forward_of_id);
CREATE INDEX IF NOT EXISTS idx_emails_reply_to_id ON public.emails (reply_to_id);
