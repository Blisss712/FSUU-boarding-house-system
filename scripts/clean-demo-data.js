/**
 * scripts/clean-demo-data.js
 * Removes seeded demo listings, demo users, and their demo auth accounts
 * from the live Supabase project.
 *
 * Usage:
 *   node scripts/clean-demo-data.js
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Seeded demo listings. Deleting a property cascades to tenancy,
// saved_properties, curfew_slips, receipts and ocular_visits.
const DEMO_PROPERTY_IDS = [
  'villa-guingona',
  'san-ignacio-dorm',
  'montilla-blvd-studio',
  'bayanihan-ladies-pad',
  'r-calo-scholastic',
];

// Real accounts that must survive the cleanup.
const KEEP_EMAILS = new Set([
  'hello@gmail.com',
  'czar@gmail.com',
  'derekj@gmail.com',
]);

// Seeded demo users (users table ids).
const DEMO_USER_IDS = [
  '94b4c583-d798-482c-9850-e3e728f310de', // jaden@gmail.com
  '6391e77d-f0d7-4cc0-909e-57deffa9b501', // student@balayurios.com
  'bd965870-e81d-45b6-8507-f70ae59d4493', // landlord@balayurios.com
  'user-student-jc',                      // jc.gomez@urios.edu.ph
  'user-student-bea',                     // bea.ramos@urios.edu.ph
  'user-student-cd',                      // cd.morales@urios.edu.ph
  'user-1792926966371-eir612',            // adsfj@gmail.com
  'a328ef5c-b343-475b-9aea-4ccd6b6757c7', // alex@balayurios.com
  '292d543f-c122-4142-ad0f-0cfc1aa02a6f', // lourdes@balayurios.com
  '80168308-caa7-46e9-9947-2a7773b407e5', // corazon@balayurios.com
  '1855b600-aa43-40ed-b94e-8302e7a3a21e', // danilo@balayurios.com
  '38686d72-473c-49a6-aa3e-1520a78c96a4', // greg@balayurios.com
  'b60456fa-c8ad-4ccb-842e-1d55f6e3563b', // derek@gmail.com
  '0973e649-26f7-4be7-92a5-0b29d8862809', // admin@balayurios.com
];

function logStep(label) {
  console.log(`\n— ${label}`);
}

async function listAllAuthUsers() {
  const users = [];
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

async function run() {
  console.log('============================================================');
  console.log('Balay Urios -> remove seeded demo data');
  console.log(`   Target: ${SUPABASE_URL}`);
  console.log('============================================================');

  logStep('Deleting demo properties (cascades related rows)');
  const { error: propError } = await supabase
    .from('properties')
    .delete()
    .in('id', DEMO_PROPERTY_IDS);
  if (propError) {
    console.error('Failed to delete properties:', propError.message);
    process.exit(1);
  }
  console.log(`Deleted ${DEMO_PROPERTY_IDS.length} demo property ids.`);

  logStep('Deleting demo rows from public.users');
  const { data: existingUsers, error: listError } = await supabase
    .from('users')
    .select('id,email')
    .in('id', DEMO_USER_IDS);
  if (listError) {
    console.error('Failed to list demo users:', listError.message);
    process.exit(1);
  }
  const removableUserIds = (existingUsers || [])
    .filter((row) => !KEEP_EMAILS.has((row.email || '').toLowerCase()))
    .map((row) => row.id);
  if (removableUserIds.length) {
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .in('id', removableUserIds);
    if (userError) {
      console.error('Failed to delete demo users:', userError.message);
      process.exit(1);
    }
  }
  console.log(`Deleted ${removableUserIds.length} demo user rows.`);

  logStep('Deleting demo Supabase Auth accounts');
  const authUsers = await listAllAuthUsers();
  const demoAuthUsers = authUsers.filter(
    (user) => !KEEP_EMAILS.has((user.email || '').toLowerCase())
      && DEMO_USER_IDS.includes(user.id),
  );
  for (const user of demoAuthUsers) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`Failed to delete auth user ${user.email}:`, error.message);
      process.exit(1);
    }
    console.log(`Deleted auth user: ${user.email}`);
  }
  console.log(`Deleted ${demoAuthUsers.length} demo auth accounts.`);

  logStep('Remaining state');
  const { data: properties } = await supabase.from('properties').select('id,name');
  const { data: users } = await supabase.from('users').select('id,name,email,role');
  const remainingAuth = await listAllAuthUsers();

  console.log('Properties:', properties?.length ? properties : '(none)');
  console.log('Public users:', users);
  console.log('Auth users:', remainingAuth.map((u) => u.email));

  console.log('\nCleanup complete.');
}

run().catch((err) => {
  console.error('\nCleanup failed:', err?.message || err);
  process.exit(1);
});
