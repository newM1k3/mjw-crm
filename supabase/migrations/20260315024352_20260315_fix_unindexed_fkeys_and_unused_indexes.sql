/*
  # Fix Unindexed Foreign Keys and Unused Indexes

  ## Changes
  1. Add covering indexes for all unindexed foreign keys:
     - contacts.client_id
     - email_templates.user_id
     - emails.user_id
     - events.client_id, events.contact_id, events.user_id
     - tags.user_id
  2. Drop unused indexes added in previous migration:
     - idx_conversation_log_user_id
     - idx_emails_forward_of_id
     - idx_emails_reply_to_id
     - idx_saved_outputs_user_id
     - idx_user_notes_user_id
*/

CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON public.contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_user_id ON public.email_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON public.emails(user_id);
CREATE INDEX IF NOT EXISTS idx_events_client_id ON public.events(client_id);
CREATE INDEX IF NOT EXISTS idx_events_contact_id ON public.events(contact_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

DROP INDEX IF EXISTS public.idx_conversation_log_user_id;
DROP INDEX IF EXISTS public.idx_emails_forward_of_id;
DROP INDEX IF EXISTS public.idx_emails_reply_to_id;
DROP INDEX IF EXISTS public.idx_saved_outputs_user_id;
DROP INDEX IF EXISTS public.idx_user_notes_user_id;
