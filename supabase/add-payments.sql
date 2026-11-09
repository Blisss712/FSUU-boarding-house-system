-- ============================================================
-- RENT PAYMENTS & OFFICIAL RECEIPTS
-- ============================================================
-- Adds the money side of a tenancy: a landlord issues a payment
-- request (invoice), the student pays and submits the reference,
-- the landlord verifies it, and the database issues an official
-- Balay Urios receipt.
--
-- LIFECYCLE
--   pending                -> invoice issued, not paid yet
--   awaiting_verification  -> student submitted a payment + reference
--   paid                   -> landlord confirmed it, receipt issued
--   rejected               -> landlord declined the submitted payment
--   cancelled              -> landlord withdrew the invoice
--
-- WHO CAN DO WHAT (enforced by RLS + a trigger)
--   * The student can read their own payments, submit a payment
--     reference, and nothing else. They cannot edit the amount,
--     change the invoice, or mark it paid.
--   * The landlord who owns the property can read the whole ledger,
--     create invoices, verify/reject payments, record cash payments
--     and cancel open invoices.
--   * Admins can see everything.
--
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Idempotent: safe to re-run.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Helper: does this row belong to the signed-in account?
-- Legacy rows can store the public.users id instead of auth.uid(),
-- so match both the auth id and the profile id for the JWT email.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- PAYMENTS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id                TEXT PRIMARY KEY,
  "propertyId"      TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  "tenancyId"       TEXT REFERENCES public.tenancy(id) ON DELETE SET NULL,
  "landlordId"      TEXT,
  "studentId"       TEXT NOT NULL,
  "studentName"     TEXT,
  "propertyName"    TEXT,
  "roomNumber"      TEXT,
  title             TEXT NOT NULL,
  category          TEXT NOT NULL DEFAULT 'Rent',
  amount            NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  "dueDate"         TEXT,
  "periodLabel"     TEXT,
  description       TEXT,
  "payTo"           TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'awaiting_verification', 'paid', 'rejected', 'cancelled')),
  method            TEXT,
  "referenceNumber" TEXT,
  "studentNote"     TEXT,
  "declineReason"   TEXT,
  "receiptId"       TEXT REFERENCES public.receipts(id) ON DELETE SET NULL,
  "paidAt"          TIMESTAMPTZ,
  "verifiedAt"      TIMESTAMPTZ,
  "verifiedBy"      TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Older copies of this table may predate a column; add it defensively.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "roomNumber"    TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "payTo"         TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "studentNote"   TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "declineReason" TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "receiptId"     TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "paidAt"        TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "verifiedAt"    TIMESTAMPTZ;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS "verifiedBy"    TEXT;

CREATE INDEX IF NOT EXISTS idx_payments_property ON public.payments("propertyId");
CREATE INDEX IF NOT EXISTS idx_payments_student  ON public.payments("studentId");
CREATE INDEX IF NOT EXISTS idx_payments_status   ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created  ON public.payments("createdAt");

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_insert" ON public.payments;
DROP POLICY IF EXISTS "payments_update" ON public.payments;
DROP POLICY IF EXISTS "payments_delete" ON public.payments;

CREATE POLICY "payments_select" ON public.payments FOR SELECT
  USING (
    public.is_current_user("studentId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "payments_insert" ON public.payments FOR INSERT
  WITH CHECK (
    public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "payments_update" ON public.payments FOR UPDATE
  USING (
    public.is_current_user("studentId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_current_user("studentId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "payments_delete" ON public.payments FOR DELETE
  USING (
    public.owns_property("propertyId")
    OR public.is_admin()
  );

-- ------------------------------------------------------------
-- Keep students inside their lane. RLS can decide which rows are
-- visible, but it cannot make only *some* columns writable — so a
-- trigger blocks a student from editing the invoice or self-verifying.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_payment_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role scripts, direct SQL (Supabase SQL editor) and FK cascades run
  -- without an auth user. Allow them through; anon still cannot reach this
  -- update because the payments RLS policies above deny it.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Detaching a receipt is bookkeeping (the receipt FK's ON DELETE SET NULL,
  -- or a pad being deleted), not a student re-pricing an invoice. Students can
  -- still never attach or swap a receipt id.
  IF NEW."receiptId" IS NULL AND OLD."receiptId" IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- The owning landlord (or an admin) may change anything.
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

DROP TRIGGER IF EXISTS payments_guard_update ON public.payments;
CREATE TRIGGER payments_guard_update
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.guard_payment_update();

-- ------------------------------------------------------------
-- Remove receipts created by the pre-ledger approval flow.
-- Those rows were inserted automatically when a landlord approved a
-- tenant — before any payment existed — so they are not proof that
-- money was received. The payment ledger now issues them only after
-- a verified payment.
-- ------------------------------------------------------------
DELETE FROM public.receipts
 WHERE (id LIKE 'rec-board-%' OR "refNumber" LIKE 'BU-ESCROW-%')
   AND status = 'Verified Official Escrow';

-- ------------------------------------------------------------
-- RECEIPTS: the boarder keeps their own history, the owning
-- landlord can now read and issue receipts for their pad too.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "receipts_select" ON public.receipts;
DROP POLICY IF EXISTS "receipts_insert" ON public.receipts;
DROP POLICY IF EXISTS "receipts_update" ON public.receipts;
DROP POLICY IF EXISTS "receipts_delete" ON public.receipts;
DROP POLICY IF EXISTS "receipts_landlord_insert" ON public.receipts;

CREATE POLICY "receipts_select" ON public.receipts FOR SELECT
  USING (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "receipts_insert" ON public.receipts FOR INSERT
  WITH CHECK (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "receipts_update" ON public.receipts FOR UPDATE
  USING (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  )
  WITH CHECK (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

CREATE POLICY "receipts_delete" ON public.receipts FOR DELETE
  USING (
    "userId" = auth.uid()::text
    OR public.is_current_user("userId")
    OR public.owns_property("propertyId")
    OR public.is_admin()
  );

-- ------------------------------------------------------------
-- Grants. RLS still applies; anon gets no access at all.
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
REVOKE ALL ON public.payments FROM anon;

COMMIT;

-- ------------------------------------------------------------
-- Verify
-- ------------------------------------------------------------
SELECT status,
       count(*) AS payments,
       COALESCE(sum(amount), 0) AS total_amount
  FROM public.payments
 GROUP BY status
 ORDER BY status;
