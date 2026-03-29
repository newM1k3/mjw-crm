/*
  # Fix RLS Policy Performance - Use (select auth.uid()) Pattern
*/

-- clients
DROP POLICY IF EXISTS "Users can select own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Users can select own clients"
  ON public.clients FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own clients"
  ON public.clients FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- contacts
DROP POLICY IF EXISTS "Users can select own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.contacts;

CREATE POLICY "Users can select own contacts"
  ON public.contacts FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own contacts"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own contacts"
  ON public.contacts FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own contacts"
  ON public.contacts FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- events
DROP POLICY IF EXISTS "Users can select own events" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

CREATE POLICY "Users can select own events"
  ON public.events FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own events"
  ON public.events FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own events"
  ON public.events FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- emails
DROP POLICY IF EXISTS "Users can select own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can insert own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can update own emails" ON public.emails;
DROP POLICY IF EXISTS "Users can delete own emails" ON public.emails;

CREATE POLICY "Users can select own emails"
  ON public.emails FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own emails"
  ON public.emails FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own emails"
  ON public.emails FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own emails"
  ON public.emails FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- tags
DROP POLICY IF EXISTS "Users can select own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete own tags" ON public.tags;

CREATE POLICY "Users can select own tags"
  ON public.tags FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own tags"
  ON public.tags FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own tags"
  ON public.tags FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own tags"
  ON public.tags FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- activities
DROP POLICY IF EXISTS "Users can select own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.activities;

CREATE POLICY "Users can select own activities"
  ON public.activities FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own activities"
  ON public.activities FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own activities"
  ON public.activities FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own activities"
  ON public.activities FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- email_templates
DROP POLICY IF EXISTS "Users can select own templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.email_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.email_templates;

CREATE POLICY "Users can select own templates"
  ON public.email_templates FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own templates"
  ON public.email_templates FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own templates"
  ON public.email_templates FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own templates"
  ON public.email_templates FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- user_settings
DROP POLICY IF EXISTS "Users can select own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete own settings" ON public.user_settings;

CREATE POLICY "Users can select own settings"
  ON public.user_settings FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own settings"
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own settings"
  ON public.user_settings FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
