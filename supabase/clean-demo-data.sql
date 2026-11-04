-- supabase/clean-demo-data.sql
--
-- Removes seeded demo data from a project that ran an older copy of
-- full-setup.sql (which used to include demo INSERT statements).
--
-- Run this once in the Supabase SQL editor. It is safe to re-run.
--
-- Demo listings ------------------------------------------------------------
-- Deleting a property cascades to tenancy, saved_properties,
-- curfew_slips, receipts and ocular_visits via ON DELETE CASCADE.
DELETE FROM properties
WHERE id IN (
  'villa-guingona',
  'san-ignacio-dorm',
  'montilla-blvd-studio',
  'bayanihan-ladies-pad',
  'r-calo-scholastic'
);

-- Demo users ---------------------------------------------------------------
-- Real accounts created through Supabase Auth are kept.
DELETE FROM users
WHERE email IN (
  'jaden@gmail.com',
  'student@balayurios.com',
  'landlord@balayurios.com',
  'jc.gomez@urios.edu.ph',
  'bea.ramos@urios.edu.ph',
  'cd.morales@urios.edu.ph',
  'adsfj@gmail.com',
  'alex@balayurios.com',
  'lourdes@balayurios.com',
  'corazon@balayurios.com',
  'danilo@balayurios.com',
  'greg@balayurios.com',
  'derek@gmail.com',
  'admin@balayurios.com'
)
AND email NOT IN (
  'hello@gmail.com',
  'czar@gmail.com',
  'derekj@gmail.com'
);

-- Demo auth accounts -------------------------------------------------------
-- Supabase Auth rows must be deleted through the Admin API:
--   node scripts/clean-demo-data.js
-- or Dashboard -> Authentication -> Users.
