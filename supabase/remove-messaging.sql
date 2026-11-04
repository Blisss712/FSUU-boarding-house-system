-- supabase/remove-messaging.sql
--
-- Permanently removes the in-app messaging system from an existing project.
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- This drops the messaging tables, their RLS policies and the membership
-- functions created by supabase/add-messaging.sql, plus the legacy `chats`
-- table from the earlier messaging implementation. It is safe to re-run.
--
-- NOTE: This does NOT touch `sms_logs`, which belongs to the separate
-- automated landlord vacancy-check-in feature, not the in-app chat system.

DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_members CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;

DROP FUNCTION IF EXISTS public.start_direct_conversation(text);
DROP FUNCTION IF EXISTS public.create_group_conversation(text, text[]);
DROP FUNCTION IF EXISTS public.add_group_members(uuid, text[]);
DROP FUNCTION IF EXISTS public.remove_group_member(uuid, text);
DROP FUNCTION IF EXISTS public.mark_conversation_read(uuid);
DROP FUNCTION IF EXISTS public.bump_conversation_on_message();
DROP FUNCTION IF EXISTS public.is_group_landlord(uuid);
DROP FUNCTION IF EXISTS public.is_conversation_member(uuid);
