-- ============================================================
-- Balay Urios (Serjon) – Complete Supabase Setup
-- Includes:
-- 1. PostgreSQL Schema with Supabase Auth integration
-- 2. Trigger on auth.users for automatic profile creation
-- 3. Row Level Security (RLS) policies
-- 4. Initial seed data (Properties, Campuses, Appliances, Tenancy)
-- 5. Default demo auth accounts in auth.users
-- ============================================================

-- Enable pgcrypto for UUIDs & hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CAMPUSES TABLE
CREATE TABLE IF NOT EXISTS campuses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gates JSONB NOT NULL DEFAULT '[]'::jsonb,
  zones JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 2. APPLIANCES TABLE
CREATE TABLE IF NOT EXISTS appliances (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "monthlyCost" INTEGER NOT NULL,
  note TEXT
);

-- 3. PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "campusId" TEXT NOT NULL REFERENCES campuses(id) ON DELETE CASCADE,
  zone TEXT NOT NULL,
  area TEXT NOT NULL,
  "shortLocation" TEXT,
  "roomType" TEXT NOT NULL,
  gender TEXT,
  "statusTag" TEXT,
  "statusColor" TEXT DEFAULT 'green',
  "availableCount" INTEGER DEFAULT 1,
  price INTEGER NOT NULL,
  "priceSubtext" TEXT DEFAULT '/month',
  "advanceDeposit" TEXT,
  "minContract" TEXT,
  rating NUMERIC DEFAULT 5.0,
  "reviewCount" INTEGER DEFAULT 0,
  landlord JSONB NOT NULL DEFAULT '{}'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  "gateProximities" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "trikeFare" TEXT DEFAULT '₱15',
  badges JSONB NOT NULL DEFAULT '{}'::jsonb,
  "mapCoordinates" JSONB NOT NULL DEFAULT '{"x":50,"y":50}'::jsonb,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  "buildingCondition" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "floodRating" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "waterSystem" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "powerSystem" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "wifiAudit" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "commuteSteps" JSONB NOT NULL DEFAULT '[]'::jsonb,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  "vibeChecks" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "povRoute" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Real map coordinates (idempotent, so older databases pick them up too).
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9, 6);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude NUMERIC(9, 6);
CREATE INDEX IF NOT EXISTS properties_latitude_longitude_idx ON properties (latitude, longitude);

-- 4. USERS / PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  role TEXT NOT NULL CHECK (role IN ('boarder', 'landlord', 'admin')),
  "isUriosVerified" BOOLEAN NOT NULL DEFAULT false,
  "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
  "verifiedAt" TIMESTAMPTZ,
  "verifiedBy" TEXT,
  "verificationNotes" TEXT,
  phone TEXT,
  "avatarInitials" TEXT,
  "propertyId" TEXT REFERENCES properties(id) ON DELETE SET NULL,
  course TEXT,
  "yearLevel" TEXT,
  "studentId" TEXT,
  "parentName" TEXT,
  "parentRelation" TEXT,
  "parentPhone" TEXT,
  "parentCity" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- If users table already existed with NOT NULL passwordHash, remove the constraint
ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Landlord account verification (idempotent so older databases pick it up too).
ALTER TABLE users ADD COLUMN IF NOT EXISTS "isUriosVerified" BOOLEAN NOT NULL DEFAULT false;

-- Normalize an integer 0/1 flag from older databases to a real boolean.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'users'
       AND column_name = 'isUriosVerified'
       AND data_type IN ('integer', 'smallint', 'bigint')
  ) THEN
    ALTER TABLE users ALTER COLUMN "isUriosVerified" DROP DEFAULT;
    ALTER TABLE users
      ALTER COLUMN "isUriosVerified" TYPE BOOLEAN
      USING ("isUriosVerified" <> 0);
    ALTER TABLE users ALTER COLUMN "isUriosVerified" SET DEFAULT false;
  END IF;
END $$;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "verificationStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "verifiedBy" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "verificationNotes" TEXT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_verification_status_check;
ALTER TABLE users
  ADD CONSTRAINT users_verification_status_check
  CHECK ("verificationStatus" IN ('pending', 'verified', 'rejected'));
CREATE INDEX IF NOT EXISTS idx_users_landlord_verification
  ON users (role, "isUriosVerified");

-- Older copies of this schema only allowed ('boarder', 'landlord'), which makes
-- admin accounts impossible to create. Rebuild the check constraint so it always
-- includes 'admin', even when the table already existed.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('boarder', 'landlord', 'admin'));

-- 5. OCULAR VISITS TABLE
CREATE TABLE IF NOT EXISTS ocular_visits (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  course TEXT NOT NULL,
  phone TEXT,
  date TEXT NOT NULL,
  "timeSlot" TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'confirmed',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SMS LOGS TABLE
CREATE TABLE IF NOT EXISTS sms_logs (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  direction TEXT NOT NULL,
  message TEXT NOT NULL,
  "replyCode" TEXT,
  status TEXT DEFAULT 'delivered',
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SAVED PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS saved_properties (
  id BIGSERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "propertyId")
);

-- 8. TENANCY TABLE
CREATE TABLE IF NOT EXISTS tenancy (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  "propertyName" TEXT NOT NULL,
  "roomNumber" TEXT NOT NULL,
  "submeterNumber" TEXT NOT NULL,
  "submeterKwh" NUMERIC NOT NULL DEFAULT 0,
  "submeterCost" NUMERIC NOT NULL DEFAULT 0,
  "nextRentDue" TEXT NOT NULL,
  semester TEXT DEFAULT '1st Sem 2026-2027',
  "isActive" INTEGER DEFAULT 1
);

-- Tenancy lifecycle status (pending -> active -> ended). Added by
-- supabase/add-tenancy-approval.sql on older projects; included here so
-- fresh installations keep the whole workflow in one script.
ALTER TABLE tenancy ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 9. CURFEW SLIPS TABLE
CREATE TABLE IF NOT EXISTS curfew_slips (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  "studentName" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  course TEXT NOT NULL,
  reason TEXT NOT NULL,
  "dutyLocation" TEXT,
  date TEXT NOT NULL,
  "expectedReturn" TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  "digitalPassCode" TEXT NOT NULL,
  "landlordNote" TEXT,
  "approvedAt" TIMESTAMPTZ,
  "approvedBy" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 10. RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  "paymentDate" TEXT NOT NULL,
  "refNumber" TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'Verified Official Escrow'
);

-- 11. RENT PAYMENTS & OFFICIAL RECEIPTS
-- A landlord issues an invoice (payment request), the student pays and
-- submits the reference, the landlord verifies it, and a receipt is
-- issued. See supabase/add-payments.sql for the full migration notes.
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  "tenancyId" TEXT REFERENCES tenancy(id) ON DELETE SET NULL,
  "landlordId" TEXT,
  "studentId" TEXT NOT NULL,
  "studentName" TEXT,
  "propertyName" TEXT,
  "roomNumber" TEXT,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Rent',
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  "dueDate" TEXT,
  "periodLabel" TEXT,
  description TEXT,
  "payTo" TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'awaiting_verification', 'paid', 'rejected', 'cancelled')),
  method TEXT,
  "referenceNumber" TEXT,
  "studentNote" TEXT,
  "declineReason" TEXT,
  "receiptId" TEXT REFERENCES receipts(id) ON DELETE SET NULL,
  "paidAt" TIMESTAMPTZ,
  "verifiedAt" TIMESTAMPTZ,
  "verifiedBy" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. STUDENT RATINGS FOR BOARDING HOUSES
-- Only students who actually boarded a property may rate it. Everyone
-- else may read the ratings. See supabase/add-property-reviews.sql.
CREATE TABLE IF NOT EXISTS property_reviews (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  "userId" TEXT NOT NULL,
  "studentName" TEXT,
  course TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("propertyId", "userId")
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_properties_campus ON properties("campusId");
CREATE INDEX IF NOT EXISTS idx_properties_zone ON properties(zone);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_visits_property ON ocular_visits("propertyId");
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_properties("userId");
CREATE INDEX IF NOT EXISTS idx_tenancy_user ON tenancy("userId");
CREATE INDEX IF NOT EXISTS idx_tenancy_property ON tenancy("propertyId");
CREATE INDEX IF NOT EXISTS idx_tenancy_active ON tenancy("isActive");
CREATE INDEX IF NOT EXISTS idx_curfew_user ON curfew_slips("userId");
CREATE INDEX IF NOT EXISTS idx_curfew_property ON curfew_slips("propertyId");
CREATE INDEX IF NOT EXISTS idx_curfew_status ON curfew_slips(status);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts("userId");
CREATE INDEX IF NOT EXISTS idx_payments_property ON payments("propertyId");
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments("studentId");
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments("createdAt");
CREATE INDEX IF NOT EXISTS idx_property_reviews_property ON property_reviews("propertyId");
CREATE INDEX IF NOT EXISTS idx_property_reviews_user ON property_reviews("userId");

-- ============================================================
-- SUPABASE AUTH TRIGGER: AUTO-CREATE PUBLIC.USERS PROFILE
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    email,
    role,
    phone,
    "avatarInitials",
    "propertyId",
    course,
    "yearLevel",
    "studentId",
    "parentName",
    "parentRelation",
    "parentPhone",
    "parentCity"
  )
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'boarder'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'avatarInitials', UPPER(SUBSTRING(COALESCE(NEW.raw_user_meta_data->>'name', 'U'), 1, 2))),
    NEW.raw_user_meta_data->>'propertyId',
    NEW.raw_user_meta_data->>'course',
    NEW.raw_user_meta_data->>'yearLevel',
    NEW.raw_user_meta_data->>'studentId',
    NEW.raw_user_meta_data->>'parentName',
    NEW.raw_user_meta_data->>'parentRelation',
    NEW.raw_user_meta_data->>'parentPhone',
    NEW.raw_user_meta_data->>'parentCity'
  )
  ON CONFLICT (email) DO UPDATE SET
    id = EXCLUDED.id,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- SUPABASE AUTH TRIGGER: REMOVE THE PROFILE WHEN AN ACCOUNT IS DELETED
-- ============================================================
-- `public.users` has no foreign key to `auth.users`, so deleting an account in
-- Authentication used to leave its profile (and its valid-ID row) behind. The
-- Auditor tab reads those tables, so a deleted landlord kept appearing under
-- "Landlord Accounts" / "Pending audit". This is the mirror image of the
-- sign-up trigger above. See also supabase/fix-deleted-accounts.sql (same
-- definitions + a one-time cleanup of rows orphaned before this existed).
CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed_id text;
BEGIN
  -- Assigned in the body (not as a DECLARE default) so OLD is guaranteed to be
  -- populated at the time the value is read.
  removed_id := OLD.id::text;

  IF to_regclass('public.landlord_ids') IS NOT NULL THEN
    DELETE FROM public.landlord_ids WHERE "userId" = removed_id;
  END IF;

  IF to_regclass('public.saved_properties') IS NOT NULL THEN
    DELETE FROM public.saved_properties WHERE "userId" = removed_id;
  END IF;

  DELETE FROM public.users WHERE id = removed_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_deleted_auth_user();

-- Landlord accounts that still exist in Authentication. api.getLandlords()
-- reads through this so the audit can never list a deleted account. Compared in
-- text (`a.id::text = u.id`) because legacy profile ids are not always UUIDs.
CREATE OR REPLACE FUNCTION public.live_landlord_accounts()
RETURNS SETOF public.users
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin = JWT metadata (public.is_admin) or the profile row the app also
  -- honours (users.role = 'admin').
  IF NOT (
    public.is_admin()
    OR EXISTS (
      SELECT 1
        FROM public.users me
       WHERE me.id = COALESCE(auth.uid()::text, '')
         AND me.role = 'admin'
    )
  ) THEN
    RAISE EXCEPTION
      'Only an FSUU auditor (admin) can list landlord accounts.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT u.*
      FROM public.users u
     WHERE u.role = 'landlord'
       AND EXISTS (
         SELECT 1 FROM auth.users a WHERE a.id::text = u.id
       );
END;
$$;

REVOKE ALL ON FUNCTION public.live_landlord_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_landlord_accounts() TO authenticated;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocular_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE curfew_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_reviews ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to prevent duplicates on re-run.
-- NOTE: the messaging tables are excluded on purpose. Their policies are
-- owned by supabase/add-messaging.sql, and dropping them here used to leave
-- RLS switched on with no policy at all — which silently broke every chat
-- ("no conversations", "permission denied for table messages").
-- landlord_ids is excluded for the same reason: its policies are owned by
-- supabase/add-landlord-valid-id.sql.
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename NOT IN ('conversations', 'conversation_members', 'messages', 'chats', 'landlord_ids')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Helper: is the caller an admin? (read from the JWT, no table lookup)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((auth.jwt() -> 'user_metadata' ->> 'isAdmin')::boolean, false)
      OR COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin';
$$;

-- Helper: does the caller own this listing?
CREATE OR REPLACE FUNCTION public.owns_property(prop_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.properties p
     WHERE p.id = prop_id
       AND COALESCE(p.landlord->>'userId', '') = COALESCE(auth.uid()::text, '')
  );
$$;

-- Helper: has the caller actually boarded this property? (Only boarders may
-- rate a boarding house; pending/rejected applicants do not count.)
CREATE OR REPLACE FUNCTION public.has_boarded(prop_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.tenancy t
     WHERE t."propertyId" = prop_id
       AND (
         t."userId" = COALESCE(auth.uid()::text, '')
         OR t."userId" = COALESCE(
           (SELECT u.id
              FROM public.users u
             WHERE lower(u.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
             LIMIT 1),
           ''
         )
       )
       AND (
         t."isActive" = 1
         OR COALESCE(to_jsonb(t) ->> 'status', '') = 'ended'
       )
  );
$$;

-- Helper: does a stored user id belong to the signed-in account?
-- Legacy rows can hold the public.users id instead of auth.uid(), so both
-- the auth id and the profile id for the JWT email are accepted.
CREATE OR REPLACE FUNCTION public.is_current_user(user_id text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(user_id = auth.uid()::text, false)
      OR COALESCE(
           user_id = (
             SELECT u.id
               FROM public.users u
              WHERE lower(u.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
              LIMIT 1
           ),
           false
         );
$$;

-- Reference data (read-only)
CREATE POLICY "campuses_select"   ON campuses   FOR SELECT USING (true);
CREATE POLICY "appliances_select" ON appliances FOR SELECT USING (true);

-- Properties: public browse, owner-only writes
CREATE POLICY "properties_select" ON properties FOR SELECT USING (true);
CREATE POLICY "properties_insert" ON properties FOR INSERT
  WITH CHECK (COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '') OR public.is_admin());
CREATE POLICY "properties_update" ON properties FOR UPDATE
  USING  (COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '') OR public.is_admin())
  WITH CHECK (COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '') OR public.is_admin());
CREATE POLICY "properties_delete" ON properties FOR DELETE
  USING (COALESCE(landlord->>'userId', '') = COALESCE(auth.uid()::text, '') OR public.is_admin());

-- Users: public read (tenant views), owner-only writes
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid()::text OR public.is_admin());
CREATE POLICY "users_update" ON users FOR UPDATE
  USING  (id = auth.uid()::text OR public.is_admin())
  WITH CHECK (id = auth.uid()::text OR public.is_admin());
CREATE POLICY "users_delete" ON users FOR DELETE USING (public.is_admin());

-- Visits: public read, signed-in insert, owner/landlord update
CREATE POLICY "visits_select" ON ocular_visits FOR SELECT USING (true);
CREATE POLICY "visits_insert" ON ocular_visits FOR INSERT WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'authenticated');
CREATE POLICY "visits_update" ON ocular_visits FOR UPDATE
  USING (public.owns_property("propertyId") OR public.is_admin());

-- SMS Logs: public read, signed-in write
CREATE POLICY "sms_select" ON sms_logs FOR SELECT USING (true);
CREATE POLICY "sms_insert" ON sms_logs FOR INSERT WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'authenticated');

-- Saved Properties: owner only
CREATE POLICY "saved_select" ON saved_properties FOR SELECT USING ("userId" = auth.uid()::text OR public.is_admin());
CREATE POLICY "saved_insert" ON saved_properties FOR INSERT WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());
CREATE POLICY "saved_delete" ON saved_properties FOR DELETE USING ("userId" = auth.uid()::text OR public.is_admin());

-- Tenancy: owner / owning landlord / admin
CREATE POLICY "tenancy_select" ON tenancy FOR SELECT
  USING ("userId" = auth.uid()::text OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "tenancy_insert" ON tenancy FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());
CREATE POLICY "tenancy_update" ON tenancy FOR UPDATE
  USING  ("userId" = auth.uid()::text OR public.owns_property("propertyId") OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "tenancy_delete" ON tenancy FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- Curfew Slips: owner / owning landlord / admin
CREATE POLICY "curfew_select" ON curfew_slips FOR SELECT
  USING ("userId" = auth.uid()::text OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "curfew_insert" ON curfew_slips FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());
CREATE POLICY "curfew_update" ON curfew_slips FOR UPDATE
  USING  ("userId" = auth.uid()::text OR public.owns_property("propertyId") OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "curfew_delete" ON curfew_slips FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_admin());

-- Receipts: boarder / owning landlord / admin
CREATE POLICY "receipts_select" ON receipts FOR SELECT
  USING ("userId" = auth.uid()::text OR public.is_current_user("userId") OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "receipts_insert" ON receipts FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text OR public.is_current_user("userId") OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "receipts_update" ON receipts FOR UPDATE
  USING  ("userId" = auth.uid()::text OR public.is_current_user("userId") OR public.owns_property("propertyId") OR public.is_admin())
  WITH CHECK ("userId" = auth.uid()::text OR public.is_current_user("userId") OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "receipts_delete" ON receipts FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_current_user("userId") OR public.owns_property("propertyId") OR public.is_admin());

-- Payments: student reads/submits their own; owning landlord runs the ledger
CREATE POLICY "payments_select" ON payments FOR SELECT
  USING (public.is_current_user("studentId") OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "payments_insert" ON payments FOR INSERT
  WITH CHECK (public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "payments_update" ON payments FOR UPDATE
  USING  (public.is_current_user("studentId") OR public.owns_property("propertyId") OR public.is_admin())
  WITH CHECK (public.is_current_user("studentId") OR public.owns_property("propertyId") OR public.is_admin());
CREATE POLICY "payments_delete" ON payments FOR DELETE
  USING (public.owns_property("propertyId") OR public.is_admin());

-- A student may submit a payment reference, never verify or reprice it.
CREATE OR REPLACE FUNCTION public.guard_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.owns_property(OLD."propertyId") OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF public.is_current_user(OLD."studentId") THEN
    IF NEW."studentId" <> OLD."studentId"
       OR NEW."propertyId" <> OLD."propertyId"
       OR NEW."landlordId" IS DISTINCT FROM OLD."landlordId"
       OR NEW.amount <> OLD.amount
       OR NEW.title <> OLD.title
       OR NEW.category <> OLD.category
       OR NEW."dueDate" IS DISTINCT FROM OLD."dueDate"
       OR NEW."receiptId" IS DISTINCT FROM OLD."receiptId"
       OR NEW."verifiedAt" IS DISTINCT FROM OLD."verifiedAt"
       OR NEW."verifiedBy" IS DISTINCT FROM OLD."verifiedBy"
    THEN
      RAISE EXCEPTION 'Students may only submit a payment method, reference number and note.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN ('pending', 'awaiting_verification') THEN
      RAISE EXCEPTION 'Students cannot mark a payment as paid or cancelled.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'You are not allowed to update this payment.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS payments_guard_update ON payments;
CREATE TRIGGER payments_guard_update
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_update();


-- Boarding-house ratings: public read, write only for students who boarded.
CREATE POLICY "property_reviews_select" ON property_reviews FOR SELECT USING (true);
CREATE POLICY "property_reviews_insert" ON property_reviews FOR INSERT
  WITH CHECK ("userId" = auth.uid()::text AND public.has_boarded("propertyId"));
CREATE POLICY "property_reviews_update" ON property_reviews FOR UPDATE
  USING  ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text AND public.has_boarded("propertyId"));
CREATE POLICY "property_reviews_delete" ON property_reviews FOR DELETE
  USING ("userId" = auth.uid()::text OR public.is_admin());


-- ============================================================
-- NO SEED DATA
-- ============================================================
-- This setup intentionally contains no demo listings, demo users, demo
-- tenancies, or demo receipts. Real accounts are created through
-- Supabase Auth (the sign-up form in the app) and real listings are created
-- by the signed-in landlord from My Listings.
--
-- Campuses and appliances are reference data. If they are missing, add the
-- real campuses/zones/appliances for your school through the Supabase Table
-- Editor or the app.
--
-- To remove old sample data from an existing project, run:
--   supabase/clean-demo-data.sql