/**
 * scripts/create-test-accounts.js
 * Creates real Supabase Auth accounts for testing:
 *   20 boarder/student accounts
 *   10 landlord accounts, each with ONE properly-linked listing
 *
 * Each auth account is email-confirmed and gets a matching row in public.users.
 * Landlords also get a boarding-house listing whose landlord.userId points at
 * their auth id (the durable ownership link the app + RLS rely on).
 *
 * Safe to re-run: existing accounts/listings are updated, never duplicated,
 * and any existing propertyId/listing ownership is preserved.
 *
 * Usage:
 *   node scripts/create-test-accounts.js
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.
 *
 * NOTE: every test account shares one password (123123) on purpose.
 * This is a LOCAL DEV / DEMO helper only — never run it against a
 * production project.
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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const SHARED_PASSWORD = '123123';
const BOARDER_COUNT = 20;
const LANDLORD_COUNT = 10;
const CAMPUS_ID = 'fsuu-main';

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function buildAccounts(prefix, count, role) {
  const label = role === 'landlord' ? 'Landlord' : 'Boarder';
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const name = `${label} Test ${number}`;
    return {
      name,
      email: `${prefix}${number}@example.com`,
      role,
      avatarInitials: initials(name),
    };
  });
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

async function ensureAuthUser(account, existingByEmail) {
  const existing = existingByEmail.get(account.email);

  // Preserve any existing metadata (e.g. propertyId, isAdmin) — only
  // overwrite the fields this script owns. Setting propertyId: null here
  // used to wipe a landlord's listing link on every re-run.
  const baseMeta = existing?.user_metadata || {};
  const metadata = {
    ...baseMeta,
    name: account.name,
    role: account.role,
    avatarInitials: account.avatarInitials,
  };

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: SHARED_PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return { user: data.user, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: SHARED_PASSWORD,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  return { user: data.user, created: true };
}

async function ensureProfile(account, authUser) {
  // Preserve existing profile fields (phone, course, propertyId, …) and
  // only guarantee id/name/email/role. Re-runs must not wipe propertyId.
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('email', account.email)
    .maybeSingle();

  const record = {
    ...(existing || {}),
    id: authUser.id,
    name: account.name,
    email: account.email,
    role: account.role,
    avatarInitials: existing?.avatarInitials || account.avatarInitials,
    propertyId: existing?.propertyId || null,
    passwordHash: null,
  };
  if (!existing) record.createdAt = new Date().toISOString();

  const { error } = await supabase
    .from('users')
    .upsert(record, { onConflict: 'email' });
  if (error) throw new Error(`Failed to save profile for ${account.email}: ${error.message}`);
  return record;
}

async function ensureListing(account, authUser) {
  // Find an existing listing owned by this landlord (by email or userId),
  // otherwise create one. Always write the durable landlord.userId link.
  const { data: existingListings } = await supabase
    .from('properties')
    .select('id, name, landlord')
    .eq('campusId', CAMPUS_ID)
    .or(`landlord->>email.eq.${account.email},landlord->>userId.eq.${authUser.id}`);

  const landlord = {
    name: account.name,
    role: 'landlord',
    email: account.email,
    phone: '+63 900 000 0000',
    userId: authUser.id,
  };

  const existing = existingListings?.[0];
  if (existing) {
    const { error } = await supabase
      .from('properties')
      .update({ landlord })
      .eq('id', existing.id);
    if (error) throw new Error(`Failed to link listing for ${account.email}: ${error.message}`);
    return existing.id;
  }

  const id = `prop-${authUser.id.slice(0, 8)}`;
  const record = {
    id,
    name: `${account.name} Boarding House`,
    campusId: CAMPUS_ID,
    zone: 'San Ignacio',
    area: 'Near FSUU',
    roomType: 'Single Room',
    gender: 'All',
    availableCount: 3,
    statusTag: '3 Rooms Available',
    statusColor: 'green',
    price: 3500,
    priceSubtext: '/month',
    advanceDeposit: '1 month',
    minContract: '6 months',
    rating: 0,
    reviewCount: 0,
    landlord,
    images: [],
    gateProximities: {},
    trikeFare: '₱15',
    badges: {},
    mapCoordinates: { x: 50, y: 50 },
    commuteSteps: [],
    amenities: [],
    rules: [],
    vibeChecks: {},
    povRoute: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from('properties').insert(record);
  if (error) throw new Error(`Failed to create listing for ${account.email}: ${error.message}`);
  return id;
}

async function run() {
  console.log('============================================================');
  console.log('Balay Urios -> create test accounts + landlord listings');
  console.log(`   Target: ${SUPABASE_URL}`);
  console.log(`   Password for every test account: ${SHARED_PASSWORD}`);
  console.log('============================================================\n');

  const accounts = [
    ...buildAccounts('student', BOARDER_COUNT, 'boarder'),
    ...buildAccounts('landlord', LANDLORD_COUNT, 'landlord'),
  ];

  const authUsers = await listAllAuthUsers();
  const existingByEmail = new Map(
    authUsers.map((user) => [(user.email || '').toLowerCase(), user]),
  );

  const created = [];
  const updated = [];
  let listings = 0;

  for (const account of accounts) {
    const { user, created: isNew } = await ensureAuthUser(account, existingByEmail);
    if (!user) throw new Error(`No auth user returned for ${account.email}`);

    await ensureProfile(account, user);

    if (account.role === 'landlord') {
      const propertyId = await ensureListing(account, user);
      // Point the landlord profile at their listing.
      await supabase.from('users').update({ propertyId }).eq('id', user.id);
      listings += 1;
    }

    (isNew ? created : updated).push(account.email);
  }

  console.log(`Created ${created.length} new auth accounts.`);
  console.log(`Updated ${updated.length} existing auth accounts.`);
  console.log(`Landlord listings ensured: ${listings}.`);
  console.log('\nBoarders (20):');
  accounts
    .filter((a) => a.role === 'boarder')
    .forEach((a) => console.log(`  ${a.email}  |  ${a.name}`));
  console.log('\nLandlords (10):');
  accounts
    .filter((a) => a.role === 'landlord')
    .forEach((a) => console.log(`  ${a.email}  |  ${a.name}`));

  const { count: boarderCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'boarder');
  const { count: landlordCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'landlord');
  const { count: listingCount } = await supabase
    .from('properties')
    .select('*', { count: 'exact', head: true });

  console.log('\nCurrent state:');
  console.log(`  boarders:  ${boarderCount}`);
  console.log(`  landlords: ${landlordCount}`);
  console.log(`  listings:  ${listingCount}`);
  console.log('\nDone.');
}

run().catch((err) => {
  console.error('\nFailed:', err?.message || err);
  process.exit(1);
});
