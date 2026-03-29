/*
  # Drop Unused Indexes

  ## Summary
  The following indexes have never been used by the query planner. Unused indexes
  consume disk space and slow down write operations (INSERT, UPDATE, DELETE) without
  providing any query performance benefit.

  ## Indexes Dropped
  - idx_activities_created_at on public.activities
  - idx_events_client_id on public.events
  - idx_events_contact_id on public.events
  - idx_email_templates_user_id on public.email_templates
  - idx_emails_folder on public.emails
*/

DROP INDEX IF EXISTS public.idx_activities_created_at;
DROP INDEX IF EXISTS public.idx_events_client_id;
DROP INDEX IF EXISTS public.idx_events_contact_id;
DROP INDEX IF EXISTS public.idx_email_templates_user_id;
DROP INDEX IF EXISTS public.idx_emails_folder;
