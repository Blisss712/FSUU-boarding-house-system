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

-- 4. USERS / PROFILES TABLE (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT,
  role TEXT NOT NULL CHECK (role IN ('boarder', 'landlord', 'admin')),
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

-- 6. CHATS TABLE
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  time TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. SMS LOGS TABLE
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

-- 8. SAVED PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS saved_properties (
  id BIGSERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("userId", "propertyId")
);

-- 9. TENANCY TABLE
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

-- 10. CURFEW SLIPS TABLE
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

-- 11. RECEIPTS TABLE
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

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_properties_campus ON properties("campusId");
CREATE INDEX IF NOT EXISTS idx_properties_zone ON properties(zone);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_chats_property ON chats("propertyId");
CREATE INDEX IF NOT EXISTS idx_visits_property ON ocular_visits("propertyId");
CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_properties("userId");
CREATE INDEX IF NOT EXISTS idx_tenancy_user ON tenancy("userId");
CREATE INDEX IF NOT EXISTS idx_tenancy_property ON tenancy("propertyId");
CREATE INDEX IF NOT EXISTS idx_tenancy_active ON tenancy("isActive");
CREATE INDEX IF NOT EXISTS idx_curfew_user ON curfew_slips("userId");
CREATE INDEX IF NOT EXISTS idx_curfew_property ON curfew_slips("propertyId");
CREATE INDEX IF NOT EXISTS idx_curfew_status ON curfew_slips(status);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON receipts("userId");

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
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE appliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocular_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE curfew_slips ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Drop previous policies to prevent duplicates on re-run
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
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

-- Users: public read (chat/tenant views), owner-only writes
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (id = auth.uid()::text OR public.is_admin());
CREATE POLICY "users_update" ON users FOR UPDATE
  USING  (id = auth.uid()::text OR public.is_admin())
  WITH CHECK (id = auth.uid()::text OR public.is_admin());
CREATE POLICY "users_delete" ON users FOR DELETE USING (public.is_admin());

-- Chats: public read, signed-in write (no owner column to scope by)
CREATE POLICY "chats_select" ON chats FOR SELECT USING (true);
CREATE POLICY "chats_insert" ON chats FOR INSERT WITH CHECK (COALESCE(auth.jwt()->>'role', '') = 'authenticated');

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

-- Receipts: owner only
CREATE POLICY "receipts_select" ON receipts FOR SELECT USING ("userId" = auth.uid()::text OR public.is_admin());
CREATE POLICY "receipts_insert" ON receipts FOR INSERT WITH CHECK ("userId" = auth.uid()::text OR public.is_admin());
CREATE POLICY "receipts_update" ON receipts FOR UPDATE USING ("userId" = auth.uid()::text OR public.is_admin());
CREATE POLICY "receipts_delete" ON receipts FOR DELETE USING ("userId" = auth.uid()::text OR public.is_admin());


-- ============================================================
-- NO SEED DATA
-- ============================================================
-- This setup intentionally contains no demo listings, demo users, demo
-- chats, demo tenancies, or demo receipts. Real accounts are created through
-- Supabase Auth (the sign-up form in the app) and real listings are created
-- by the signed-in landlord from My Listings.
--
-- Campuses and appliances are reference data. If they are missing, add the
-- real campuses/zones/appliances for your school through the Supabase Table
-- Editor or the app.
--
-- To remove old sample data from an existing project, run:
--   supabase/clean-demo-data.sql