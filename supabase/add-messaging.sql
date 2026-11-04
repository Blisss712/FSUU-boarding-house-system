-- ============================================================
-- IN-APP MESSAGING (Messenger-style)
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- What this creates
--   conversations         direct (1:1) and group chats
--   conversation_members   who belongs to each chat + read markers
--   messages               chat messages
--
-- Rules enforced by the database
--   * Only members of a conversation can read its messages.
--   * A message can only be sent by a member, as themselves.
--   * Anyone signed in can start a DIRECT chat with another user.
--   * GROUP chats can only be created by landlords (or admins), and only
--     the landlord who created the group can add or remove members.
--   * Membership rows cannot be written directly by clients: all membership
--     changes go through the SECURITY DEFINER functions below.
--
-- Safe to re-run.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT,
  "isGroup"    BOOLEAN NOT NULL DEFAULT false,
  "createdBy"  TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  "conversationId" UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  "userId"         TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role             TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('landlord', 'member')),
  "addedBy"        TEXT,
  "joinedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "lastReadAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("conversationId", "userId")
);

CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  "senderId"       TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body             TEXT NOT NULL CHECK (char_length(btrim(body)) > 0 AND char_length(body) <= 4000),
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_updated
  ON public.conversations ("updatedAt" DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user
  ON public.conversation_members ("userId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages ("conversationId", "createdAt" DESC);

-- ------------------------------------------------------------
-- Helpers
-- SECURITY DEFINER so the membership checks can read
-- conversation_members without triggering RLS recursion.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.conversation_members m
     WHERE m."conversationId" = conv_id
       AND m."userId" = auth.uid()::text
  );
$$;

-- True only for the landlord who created this GROUP chat.
-- Direct chats are never manageable, so nobody can add a third person.
CREATE OR REPLACE FUNCTION public.is_group_landlord(conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.conversations c
      JOIN public.users u ON u.id = auth.uid()::text
     WHERE c.id = conv_id
       AND c."isGroup" = true
       AND c."createdBy" = auth.uid()::text
       AND u.role IN ('landlord', 'admin')
  );
$$;

-- ------------------------------------------------------------
-- RPC: start (or reuse) a 1:1 conversation with another user
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_direct_conversation(p_user_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me       text := auth.uid()::text;
  existing uuid;
  conv     uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_user_id IS NULL OR btrim(p_user_id) = '' OR p_user_id = me THEN
    RAISE EXCEPTION 'Choose another person to message';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p_user_id) THEN
    RAISE EXCEPTION 'That account no longer exists';
  END IF;

  -- Reuse an existing two-person direct chat instead of creating duplicates.
  SELECT c.id INTO existing
    FROM public.conversations c
    JOIN public.conversation_members a
      ON a."conversationId" = c.id AND a."userId" = me
    JOIN public.conversation_members b
      ON b."conversationId" = c.id AND b."userId" = p_user_id
   WHERE c."isGroup" = false
     AND (SELECT count(*) FROM public.conversation_members m
           WHERE m."conversationId" = c.id) = 2
   LIMIT 1;

  IF existing IS NOT NULL THEN
    RETURN existing;
  END IF;

  INSERT INTO public.conversations ("isGroup", "createdBy")
  VALUES (false, me)
  RETURNING id INTO conv;

  INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
  VALUES (conv, me, 'member', me),
         (conv, p_user_id, 'member', me);

  RETURN conv;
END;
$$;

-- ------------------------------------------------------------
-- RPC: create a GROUP chat (landlords / admins only)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_group_conversation(p_title text, p_member_ids text[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me           text := auth.uid()::text;
  conv         uuid;
  member_count integer;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u
     WHERE u.id = me AND u.role IN ('landlord', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only landlords can create group chats';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Give the group a name';
  END IF;

  INSERT INTO public.conversations (title, "isGroup", "createdBy")
  VALUES (btrim(p_title), true, me)
  RETURNING id INTO conv;

  -- The creator is the group landlord and cannot be removed.
  INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
  VALUES (conv, me, 'landlord', me);

  INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
  SELECT conv, u.id, 'member', me
    FROM public.users u
   WHERE u.id = ANY(COALESCE(p_member_ids, ARRAY[]::text[]))
     AND u.id <> me
  ON CONFLICT ("conversationId", "userId") DO NOTHING;

  SELECT count(*) INTO member_count
    FROM public.conversation_members m
   WHERE m."conversationId" = conv;

  IF member_count < 2 THEN
    RAISE EXCEPTION 'Add at least one member to the group';
  END IF;

  RETURN conv;
END;
$$;

-- ------------------------------------------------------------
-- RPC: add members — only the group's landlord
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_group_members(p_conversation_id uuid, p_member_ids text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
BEGIN
  IF NOT public.is_group_landlord(p_conversation_id) THEN
    RAISE EXCEPTION 'Only the landlord of this group can add members';
  END IF;

  INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
  SELECT p_conversation_id, u.id, 'member', auth.uid()::text
    FROM public.users u
   WHERE u.id = ANY(COALESCE(p_member_ids, ARRAY[]::text[]))
     AND u.id <> auth.uid()::text
     AND NOT EXISTS (
       SELECT 1 FROM public.conversation_members m
        WHERE m."conversationId" = p_conversation_id
          AND m."userId" = u.id
     );

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;

-- ------------------------------------------------------------
-- RPC: remove a member — only the group's landlord
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_group_member(p_conversation_id uuid, p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_group_landlord(p_conversation_id) THEN
    RAISE EXCEPTION 'Only the landlord of this group can remove members';
  END IF;

  IF p_user_id = auth.uid()::text THEN
    RAISE EXCEPTION 'The group landlord cannot remove themselves';
  END IF;

  DELETE FROM public.conversation_members m
   WHERE m."conversationId" = p_conversation_id
     AND m."userId" = p_user_id
     AND m.role <> 'landlord';

  RETURN FOUND;
END;
$$;

-- ------------------------------------------------------------
-- RPC: mark a conversation as read for the caller
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.conversation_members
     SET "lastReadAt" = NOW()
   WHERE "conversationId" = p_conversation_id
     AND "userId" = auth.uid()::text;
$$;

-- ------------------------------------------------------------
-- Keep conversations sorted by most recent message
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.bump_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
     SET "updatedAt" = NEW."createdAt"
   WHERE id = NEW."conversationId";
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_bump_conversation ON public.messages;
CREATE TRIGGER messages_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_on_message();

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversation_members_select" ON public.conversation_members;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;

-- Conversations are visible to their members (the creator is always a member).
-- Writes happen through the RPCs above, so no INSERT/UPDATE/DELETE policy.
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(id)
    OR "createdBy" = auth.uid()::text
    OR public.is_admin()
  );

CREATE POLICY "conversation_members_select" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (public.is_conversation_member("conversationId") OR public.is_admin());

CREATE POLICY "messages_select" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_member("conversationId") OR public.is_admin());

-- A member can only ever post as themselves.
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    "senderId" = auth.uid()::text
    AND public.is_conversation_member("conversationId")
  );

-- ------------------------------------------------------------
-- Grants
-- ------------------------------------------------------------
GRANT SELECT ON public.conversations        TO authenticated;
GRANT SELECT ON public.conversation_members TO authenticated;
GRANT SELECT, INSERT ON public.messages     TO authenticated;

REVOKE ALL ON public.conversations        FROM anon;
REVOKE ALL ON public.conversation_members FROM anon;
REVOKE ALL ON public.messages             FROM anon;

REVOKE ALL ON FUNCTION public.start_direct_conversation(text)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_group_conversation(text, text[])    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_group_members(uuid, text[])            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_group_member(uuid, text)            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid)               FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_landlord(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_direct_conversation(text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_members(uuid, text[])      TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(uuid, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid)         TO authenticated;

-- ------------------------------------------------------------
-- Realtime: stream new messages and membership changes
-- ------------------------------------------------------------
DO $$
BEGIN
  -- A FOR ALL TABLES publication already streams these tables.
  IF EXISTS (
    SELECT 1 FROM pg_publication
     WHERE pubname = 'supabase_realtime'
       AND NOT puballtables
  ) THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMIT;
