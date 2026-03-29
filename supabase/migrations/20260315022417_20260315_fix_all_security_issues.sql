/*
  # Fix All Security Issues

  ## Summary
  1. Add covering indexes for all unindexed foreign keys
  2. Fix RLS policies on user_notes, conversation_log, saved_outputs, user_profiles
     to use (select auth.uid()) pattern to prevent per-row re-evaluation
  3. Drop confirmed unused indexes to reduce write overhead
*/

-- Indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_conversation_log_user_id ON public.conversation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_forward_of_id ON public.emails(forward_of_id);
CREATE INDEX IF NOT EXISTS idx_emails_reply_to_id ON public.emails(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_saved_outputs_user_id ON public.saved_outputs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_user_id ON public.user_notes(user_id);

-- Drop unused indexes
DROP INDEX IF EXISTS public.idx_events_user_id;
DROP INDEX IF EXISTS public.idx_emails_user_id;
DROP INDEX IF EXISTS public.idx_tags_user_id;
DROP INDEX IF EXISTS public.idx_activities_created_at;
DROP INDEX IF EXISTS public.idx_contacts_client_id;
DROP INDEX IF EXISTS public.idx_events_client_id;
DROP INDEX IF EXISTS public.idx_events_contact_id;
DROP INDEX IF EXISTS public.idx_email_templates_user_id;
DROP INDEX IF EXISTS public.idx_emails_folder;

-- Fix RLS on user_notes
DROP POLICY IF EXISTS "Users can select own notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can insert own notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can update own notes" ON public.user_notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON public.user_notes;

CREATE POLICY "Users can select own notes"
  ON public.user_notes FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own notes"
  ON public.user_notes FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notes"
  ON public.user_notes FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own notes"
  ON public.user_notes FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Fix RLS on conversation_log
DROP POLICY IF EXISTS "Users can select own log" ON public.conversation_log;
DROP POLICY IF EXISTS "Users can insert own log" ON public.conversation_log;
DROP POLICY IF EXISTS "Users can update own log" ON public.conversation_log;
DROP POLICY IF EXISTS "Users can delete own log" ON public.conversation_log;

CREATE POLICY "Users can select own log"
  ON public.conversation_log FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own log"
  ON public.conversation_log FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own log"
  ON public.conversation_log FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own log"
  ON public.conversation_log FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Fix RLS on saved_outputs
DROP POLICY IF EXISTS "Users can view own saved outputs" ON public.saved_outputs;
DROP POLICY IF EXISTS "Users can insert own saved outputs" ON public.saved_outputs;
DROP POLICY IF EXISTS "Users can update own saved outputs" ON public.saved_outputs;
DROP POLICY IF EXISTS "Users can delete own saved outputs" ON public.saved_outputs;

CREATE POLICY "Users can view own saved outputs"
  ON public.saved_outputs FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own saved outputs"
  ON public.saved_outputs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own saved outputs"
  ON public.saved_outputs FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own saved outputs"
  ON public.saved_outputs FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Fix RLS on user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own profile"
  ON public.user_profiles FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
