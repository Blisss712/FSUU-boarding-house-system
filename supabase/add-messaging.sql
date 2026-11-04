-- ============================================================
-- IN-APP MESSAGING (Messenger-style)
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
--
-- What this creates
--   conversations         direct (1:1) and group chats, plus PAD GROUPS
--   conversation_members   who belongs to each chat + read markers
--   messages               chat messages
--
-- PAD GROUPS (one per listing)
--   * Every listing gets exactly one dedicated group chat, named
--     "<Pad name> · Pad Group", keyed by conversations."propertyId".
--   * It is created automatically the moment the listing exists
--     (trigger on properties) and backfilled for listings that already exist.
--   * The landlord who owns the listing is added automatically as the
--     group's landlord, and every approved boarder of that pad
--     (tenancy rows with isActive = 1) is added automatically as a member.
--   * Approving a boarding application adds the new boarder; ending a
--     tenancy removes them again. All of this happens in the database, so it
--     works even if the boarder never opens the Messages tab.
--   * Pad-group membership is derived, so the landlord cannot remove an
--     active boarder by hand (they would be re-added on the next sync).
--
-- Rules enforced by the database
--   * Only members of a conversation can read its messages.
--   * A message can only be sent by a member, as themselves.
--   * Anyone signed in can start a DIRECT chat with another user.
--   * GROUP chats can only be created by landlords (or admins), and only
--     the group's manager (its creator, or the landlord who owns the pad it
--     belongs to) can add or remove members.
--   * Membership rows cannot be written directly by clients: all membership
--     changes go through the SECURITY DEFINER functions below.
--
-- Safe to re-run. Re-running also RESTORES the messaging RLS policies (the
-- older `public`-policy-cleanup blocks in full-setup.sql / rls-policies.sql
-- used to drop them, which silently broke messaging).
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
-- Pad groups: one dedicated group chat per listing
-- ------------------------------------------------------------
-- A conversation with "propertyId" set IS a pad group. The column is added
-- independently so this file stays runnable on an existing messaging schema.
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS "propertyId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid = 'public.conversations'::regclass
       AND conname = 'conversations_propertyId_fkey'
  ) THEN
    ALTER TABLE public.conversations
      ADD CONSTRAINT "conversations_propertyId_fkey"
      FOREIGN KEY ("propertyId")
      REFERENCES public.properties(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Exactly one pad group per listing.
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_property_unique
  ON public.conversations ("propertyId")
  WHERE "propertyId" IS NOT NULL;

-- Pad-group membership is rebuilt from these two lookups on every sync.
CREATE INDEX IF NOT EXISTS idx_users_property
  ON public.users ("propertyId");

-- A pad group belongs to the LISTING, not to whoever happened to open it, so
-- its creator may be unknown until the landlord's profile row exists.
ALTER TABLE public.conversations ALTER COLUMN "createdBy" DROP NOT NULL;

-- The landlord account behind a listing, resolved from its `landlord` JSON:
-- the durable landlord.userId link first, then the landlord.email fallback used
-- by legacy rows. Taking the JSON directly lets the properties trigger resolve
-- the owner from NEW without re-reading the row it is firing for.
CREATE OR REPLACE FUNCTION public.pad_landlord_from_json(p_landlord jsonb)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id text;
BEGIN
  owner_id := NULLIF(btrim(COALESCE(p_landlord->>'userId', '')), '');
  IF owner_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = owner_id) THEN
    owner_id := NULL;
  END IF;

  IF owner_id IS NULL THEN
    SELECT u.id INTO owner_id
      FROM public.users u
     WHERE lower(u.email) = lower(NULLIF(btrim(COALESCE(p_landlord->>'email', '')), ''))
     LIMIT 1;
  END IF;

  RETURN owner_id;
END;
$$;

-- Same resolution, looked up from a listing id (used by the RPCs below).
CREATE OR REPLACE FUNCTION public.pad_landlord_id(p_property_id text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  landlord jsonb;
BEGIN
  IF p_property_id IS NULL OR btrim(p_property_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT p.landlord INTO landlord
    FROM public.properties p
   WHERE p.id = p_property_id;

  IF landlord IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN public.pad_landlord_from_json(landlord);
END;
$$;

-- Can the caller manage this group's membership?
--   * a group created by hand: its creator (landlord / admin)
--   * a pad group: the landlord who owns the listing it belongs to
CREATE OR REPLACE FUNCTION public.can_manage_group(conv_id uuid)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.conversations c
      JOIN public.users u ON u.id = auth.uid()::text
     WHERE c.id = conv_id
       AND c."isGroup" = true
       AND u.role IN ('landlord', 'admin')
       AND (
         c."createdBy" = auth.uid()::text
         OR (
           c."propertyId" IS NOT NULL
           AND public.pad_landlord_id(c."propertyId") = auth.uid()::text
         )
       )
  );
$$;

-- ------------------------------------------------------------
-- Pad group engine
-- One group chat per listing; membership is DERIVED from the listing's
-- landlord plus its active tenancies, so it can always be rebuilt.
-- ------------------------------------------------------------

-- Creates (or repairs) the pad group's conversation row from listing values
-- that the caller already holds. No read of `properties` happens here, so this
-- is safe to call from an AFTER INSERT trigger on `properties`.
CREATE OR REPLACE FUNCTION public.pad_group_ensure_conversation(
  p_property_id text,
  p_name        text,
  p_landlord    jsonb
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv        uuid;
  owner_id    text;
  group_title text;
BEGIN
  IF p_property_id IS NULL OR btrim(p_property_id) = '' THEN
    RETURN NULL;
  END IF;

  owner_id := public.pad_landlord_from_json(p_landlord);
  group_title := COALESCE(NULLIF(btrim(p_name), ''), 'Pad') || ' · Pad Group';

  SELECT c.id INTO conv
    FROM public.conversations c
   WHERE c."propertyId" = p_property_id
   LIMIT 1;

  IF conv IS NULL THEN
    INSERT INTO public.conversations (title, "isGroup", "createdBy", "propertyId")
    VALUES (group_title, true, owner_id, p_property_id)
    ON CONFLICT ("propertyId") WHERE "propertyId" IS NOT NULL DO NOTHING
    RETURNING id INTO conv;

    -- Lost a simultaneous creation race: adopt the winner's conversation.
    IF conv IS NULL THEN
      SELECT c.id INTO conv
        FROM public.conversations c
       WHERE c."propertyId" = p_property_id
       LIMIT 1;
    END IF;
  ELSE
    UPDATE public.conversations
       SET title       = group_title,
           "isGroup"   = true,
           "createdBy" = COALESCE("createdBy", owner_id)
     WHERE id = conv;
  END IF;

  IF conv IS NULL THEN
    RETURN NULL;
  END IF;

  -- The landlord who owns the listing always belongs to the pad group.
  IF owner_id IS NOT NULL THEN
    INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
    VALUES (conv, owner_id, 'landlord', owner_id)
    ON CONFLICT ("conversationId", "userId")
    DO UPDATE SET role = 'landlord';

    -- The listing was transferred: the new owner is the only landlord here.
    DELETE FROM public.conversation_members m
     WHERE m."conversationId" = conv
       AND m.role = 'landlord'
       AND m."userId" <> owner_id;
  END IF;

  RETURN conv;
END;
$$;

-- Adds one boarder to their pad group, creating the group first if needed.
CREATE OR REPLACE FUNCTION public.pad_group_add_member(p_property_id text, p_user_id text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop     public.properties%ROWTYPE;
  conv     uuid;
  owner_id text;
BEGIN
  IF p_property_id IS NULL OR p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO prop FROM public.properties WHERE id = p_property_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  conv := public.pad_group_ensure_conversation(p_property_id, prop.name, prop.landlord);
  IF conv IS NULL THEN
    RETURN NULL;
  END IF;

  owner_id := public.pad_landlord_from_json(prop.landlord);

  IF p_user_id <> COALESCE(owner_id, '') THEN
    INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
    VALUES (conv, p_user_id, 'member', owner_id)
    ON CONFLICT ("conversationId", "userId") DO NOTHING;
  END IF;

  RETURN conv;
END;
$$;

-- Full reconcile of a pad group: landlord + every active boarder, and prune
-- anyone who no longer boards there (their messages stay in the thread).
CREATE OR REPLACE FUNCTION public.pad_group_sync(p_property_id text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop     public.properties%ROWTYPE;
  conv     uuid;
  owner_id text;
BEGIN
  IF p_property_id IS NULL OR btrim(p_property_id) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO prop FROM public.properties WHERE id = p_property_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  owner_id := public.pad_landlord_from_json(prop.landlord);
  conv := public.pad_group_ensure_conversation(p_property_id, prop.name, prop.landlord);

  IF conv IS NULL THEN
    RETURN NULL;
  END IF;

  -- Boarders: every active tenancy at this pad ...
  INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
  SELECT DISTINCT conv, t."userId", 'member', owner_id
    FROM public.tenancy t
   WHERE t."propertyId" = p_property_id
     AND COALESCE(t."isActive", 0) = 1
     AND t."userId" IS NOT NULL
     AND t."userId" <> COALESCE(owner_id, '')
  ON CONFLICT ("conversationId", "userId") DO NOTHING;

  -- ... plus the legacy users.propertyId pointer.
  INSERT INTO public.conversation_members ("conversationId", "userId", role, "addedBy")
  SELECT DISTINCT conv, u.id, 'member', owner_id
    FROM public.users u
   WHERE u."propertyId" = p_property_id
     AND u.id <> COALESCE(owner_id, '')
  ON CONFLICT ("conversationId", "userId") DO NOTHING;

  -- Drop boarders who no longer board here (their messages stay in the thread).
  DELETE FROM public.conversation_members m
   WHERE m."conversationId" = conv
     AND m.role <> 'landlord'
     AND m."userId" <> COALESCE(owner_id, '')
     AND NOT EXISTS (
       SELECT 1 FROM public.tenancy t
        WHERE t."propertyId" = p_property_id
          AND t."userId" = m."userId"
          AND COALESCE(t."isActive", 0) = 1
     )
     AND NOT EXISTS (
       SELECT 1 FROM public.users u
        WHERE u.id = m."userId"
          AND u."propertyId" = p_property_id
     );

  RETURN conv;
END;
$$;

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

-- True only for the manager of this GROUP chat: the landlord who created it,
-- or the landlord who owns the pad it belongs to. Direct chats are never
-- manageable, so nobody can add a third person.
CREATE OR REPLACE FUNCTION public.is_group_landlord(conv_id uuid)
RETURNS boolean
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_manage_group(conv_id);
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
-- RPC: add members — only the group's manager
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
  IF NOT public.can_manage_group(p_conversation_id) THEN
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
-- RPC: remove a member — only the group's manager
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.remove_group_member(p_conversation_id uuid, p_user_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.can_manage_group(p_conversation_id) THEN
    RAISE EXCEPTION 'Only the landlord of this group can remove members';
  END IF;

  IF p_user_id = auth.uid()::text THEN
    RAISE EXCEPTION 'The group landlord cannot remove themselves';
  END IF;

  -- Pad-group membership mirrors the pad's active tenancies, so removing an
  -- active boarder by hand would only last until the next sync.
  IF EXISTS (
    SELECT 1
      FROM public.conversations c
     WHERE c.id = p_conversation_id
       AND c."propertyId" IS NOT NULL
       AND (
         EXISTS (
           SELECT 1 FROM public.tenancy t
            WHERE t."propertyId" = c."propertyId"
              AND t."userId" = p_user_id
              AND COALESCE(t."isActive", 0) = 1
         )
         OR EXISTS (
           SELECT 1 FROM public.users u
            WHERE u.id = p_user_id
              AND u."propertyId" = c."propertyId"
         )
       )
  ) THEN
    RAISE EXCEPTION 'Active boarders stay in the pad group automatically. End their tenancy to remove them.';
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
-- Automatic pad groups: triggers
-- The engine functions live above (see "Pad group engine"). Every trigger
-- body is exception-safe, so a messaging problem can NEVER block creating a
-- listing, boarding a pad, or editing a profile.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pad_group_on_property_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Build the conversation from NEW (never re-read the row being inserted,
    -- which may not be visible to a query inside this statement yet) ...
    PERFORM public.pad_group_ensure_conversation(NEW.id, NEW.name, NEW.landlord);

    -- ... then reconcile membership. Harmless if the row is not visible yet:
    -- the tenancy/user triggers and the RPCs repair it afterwards.
    PERFORM public.pad_group_sync(NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Pad group skipped for listing %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Creating a listing creates its pad group immediately (the landlord is joined
-- by pad_group_ensure_conversation), and renaming or transferring a listing
-- keeps it in sync.
DROP TRIGGER IF EXISTS pad_group_on_property_change ON public.properties;
CREATE TRIGGER pad_group_on_property_change
AFTER INSERT OR UPDATE OF name, landlord ON public.properties
FOR EACH ROW EXECUTE FUNCTION public.pad_group_on_property_change();

CREATE OR REPLACE FUNCTION public.pad_group_on_tenancy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    -- Add the boarder from NEW directly: an approved application must never be
    -- missed because the row is not visible to a query yet.
    IF NEW."propertyId" IS NOT NULL
       AND COALESCE(NEW."isActive", 0) = 1
       AND NEW."userId" IS NOT NULL THEN
      PERFORM public.pad_group_add_member(NEW."propertyId", NEW."userId");
    END IF;

    -- Reconcile (also drops boarders whose tenancy just ended).
    IF NEW."propertyId" IS NOT NULL THEN
      PERFORM public.pad_group_sync(NEW."propertyId");
    END IF;

    -- Moving a tenancy to another pad: re-sync the old pad as well.
    IF TG_OP = 'UPDATE' THEN
      IF OLD."propertyId" IS DISTINCT FROM NEW."propertyId" THEN
        PERFORM public.pad_group_sync(OLD."propertyId");
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Pad group skipped for tenancy %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Approving an application flips isActive to 1 -> the boarder joins the group.
-- Ending a tenancy flips it back to 0 -> the boarder leaves the group.
DROP TRIGGER IF EXISTS pad_group_on_tenancy_change ON public.tenancy;
CREATE TRIGGER pad_group_on_tenancy_change
AFTER INSERT OR UPDATE OF "isActive", "propertyId" ON public.tenancy
FOR EACH ROW EXECUTE FUNCTION public.pad_group_on_tenancy_change();

CREATE OR REPLACE FUNCTION public.pad_group_on_user_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prop record;
BEGIN
  BEGIN
    -- A boarder linked to a pad through users.propertyId joins that pad group.
    IF NEW."propertyId" IS NOT NULL THEN
      PERFORM public.pad_group_add_member(NEW."propertyId", NEW.id);
      PERFORM public.pad_group_sync(NEW."propertyId");
    END IF;

    -- A landlord profile can arrive after the listing was created. Match it
    -- back to the listings it owns so the landlord still gets added.
    IF NEW.email IS NOT NULL THEN
      FOR prop IN
        SELECT p.id
          FROM public.properties p
         WHERE lower(COALESCE(p.landlord->>'email', '')) = lower(NEW.email)
            OR COALESCE(p.landlord->>'userId', '') = NEW.id
      LOOP
        BEGIN
          PERFORM public.pad_group_sync(prop.id);
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Pad group skipped for listing %: %', prop.id, SQLERRM;
        END;
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Pad group skipped for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pad_group_on_user_change ON public.users;
CREATE TRIGGER pad_group_on_user_change
AFTER INSERT OR UPDATE OF email, "propertyId" ON public.users
FOR EACH ROW EXECUTE FUNCTION public.pad_group_on_user_change();

-- ------------------------------------------------------------
-- RPC: open (and repair) the pad group for a listing
-- Allowed for the pad's landlord, its boarders, and admins. This makes the
-- Messages tab self-healing even for listings created before this migration.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_pad_group(p_property_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me   text := auth.uid()::text;
  conv uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_property_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = p_property_id) THEN
    RAISE EXCEPTION 'That listing no longer exists';
  END IF;

  IF NOT (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'isAdmin')::boolean, false)
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR public.pad_landlord_id(p_property_id) = me
    OR EXISTS (
      SELECT 1 FROM public.tenancy t
       WHERE t."propertyId" = p_property_id
         AND t."userId" = me
         AND COALESCE(t."isActive", 0) = 1
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
       WHERE u.id = me AND u."propertyId" = p_property_id
    )
  ) THEN
    RAISE EXCEPTION 'Only the landlord or a boarder of this pad can open its pad group';
  END IF;

  conv := public.pad_group_sync(p_property_id);

  IF conv IS NULL THEN
    RAISE EXCEPTION 'Could not open the pad group for this listing';
  END IF;

  RETURN conv;
END;
$$;

-- ------------------------------------------------------------
-- RPC: force a membership re-sync — the pad's landlord (or an admin)
-- Use after approving a boarder or when a listing was transferred.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_pad_group(p_property_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me   text := auth.uid()::text;
  conv uuid;
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_property_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.properties p WHERE p.id = p_property_id) THEN
    RAISE EXCEPTION 'That listing no longer exists';
  END IF;

  IF NOT (
    COALESCE((auth.jwt() -> 'user_metadata' ->> 'isAdmin')::boolean, false)
    OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    OR public.pad_landlord_id(p_property_id) = me
  ) THEN
    RAISE EXCEPTION 'Only the landlord of this pad can re-sync its group';
  END IF;

  RETURN public.pad_group_sync(p_property_id);
END;
$$;

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
REVOKE ALL ON FUNCTION public.ensure_pad_group(text)                     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_pad_group(text)                       FROM PUBLIC;

-- Internal membership plumbing: never callable straight from the API.
REVOKE ALL ON FUNCTION public.pad_landlord_from_json(jsonb)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pad_landlord_id(text)          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pad_group_ensure_conversation(text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pad_group_add_member(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pad_group_sync(text)           FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pad_group_on_property_change() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pad_group_on_tenancy_change()  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pad_group_on_user_change()     FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_landlord(uuid)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_group(uuid)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_direct_conversation(text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_group_members(uuid, text[])      TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_group_member(uuid, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_pad_group(text)               TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_pad_group(text)                 TO authenticated;

-- ------------------------------------------------------------
-- Backfill: give every listing that already exists its pad group, and make
-- sure the landlord + current boarders are in it.
-- ------------------------------------------------------------
DO $$
DECLARE
  rec record;
  synced integer := 0;
BEGIN
  FOR rec IN SELECT id FROM public.properties LOOP
    BEGIN
      PERFORM public.pad_group_sync(rec.id);
      synced := synced + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Pad group backfill skipped for listing %: %', rec.id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'Pad groups ready for % listing(s).', synced;
END $$;

-- ------------------------------------------------------------
-- Realtime: stream new messages, membership changes and new pad groups
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
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMIT;

-- ------------------------------------------------------------
-- Verify (read-only — shows the pad group created for every listing)
-- Expect one row per listing, with the landlord marked role = 'landlord'.
-- ------------------------------------------------------------
SELECT p.name                                            AS pad,
       c.title                                           AS pad_group,
       count(m."userId")                                 AS members,
       count(*) FILTER (WHERE m.role = 'landlord')        AS landlords
  FROM public.properties p
  JOIN public.conversations c ON c."propertyId" = p.id
  LEFT JOIN public.conversation_members m ON m."conversationId" = c.id
 GROUP BY p.name, c.title
 ORDER BY p.name;
