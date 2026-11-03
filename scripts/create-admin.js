/**
 * scripts/create-admin.js
 * Creates — or promotes — a Balay Urios admin account in Supabase.
 *
 * Admin access in this app is decided by `public.users.role = 'admin'`
 * (and/or `user_metadata.isAdmin = true`). Public sign-up intentionally
 * blocks self-registration as admin, so the only correct way to mint an
 * admin is with the service-role key, which is what this script does.
 *
 * Usage:
 *   node scripts/create-admin.js <email> [password] [name]
 *
 * Examples:
 *   node scripts/create-admin.js admin@balayurios.app
 *   node scripts/create-admin.js admin@balayurios.app "MyStr0ngPass!" "Derek Reyes"
 *   node scripts/create-admin.js czar@gmail.com "MyStr0ngPass!"   # promote existing
 *
 * Behaviour:
 *   - Creates the Supabase Auth user if it does not exist (email pre-confirmed).
 *   - If it already exists, keeps the account and resets its password.
 *   - Sets user_metadata.role = 'admin' AND user_metadata.isAdmin = true.
 *   - Upserts public.users so role = 'admin' and id matches the auth user id.
 *   - If no password is supplied, a strong one is generated and printed once.
 *   - Finishes by signing in through the ANON key to prove the app will
 *     resolve the account as admin (prints nothing secret but the test email).
 *
 * Requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const [emailArg, passwordArg, ...nameParts] = process.argv.slice(2);

if (!emailArg) {
  console.error('Usage: node scripts/create-admin.js <email> [password] [name]');
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
const name = nameParts.join(' ').trim() || email.split('@')[0];
const password = passwordArg || generatePassword();

function generatePassword() {
  // 18 random bytes -> URL-safe string, guaranteed to satisfy the 8-char minimum.
  return randomBytes(18).toString('base64url');
}

function initials(value) {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findAuthUserByEmail(targetEmail) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((u) => (u.email || '').toLowerCase() === targetEmail);
    if (match) return match;
    if (users.length < 200) return null;
  }
}

async function ensureAuthUser() {
  const existing = await findAuthUserByEmail(email);

  const metadata = {
    ...(existing?.user_metadata || {}),
    name,
    role: 'admin',
    isAdmin: true,
    avatarInitials: initials(name),
  };

  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw error;
    return { user: data.user, created: false };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  return { user: data.user, created: true };
}

async function ensureAdminProfile(authUser) {
  // Preserve whatever the profile already holds; only guarantee id/email/role.
  const { data: existing, error: existingErr } = await admin
    .from('users')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (existingErr) throw existingErr;

  const record = {
    ...(existing || {}),
    id: authUser.id,
    name: existing?.name || name,
    email,
    role: 'admin',
    avatarInitials: existing?.avatarInitials || initials(existing?.name || name),
    passwordHash: null,
  };
  if (!existing) record.createdAt = new Date().toISOString();

  const { error } = await admin.from('users').upsert(record, { onConflict: 'email' });
  if (error) throw error;

  // Re-read so the report reflects what the app will actually see.
  const { data: profile, error: readErr } = await admin
    .from('users')
    .select('id,email,role,name')
    .eq('email', email)
    .maybeSingle();
  if (readErr) throw readErr;
  return profile;
}

async function verifyAppResolution() {
  if (!ANON_KEY) return { skipped: true };
  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, reason: error.message };

  const authUser = data.user;
  const { data: profile, error: profileErr } = await client
    .from('users')
    .select('role')
    .eq('email', email)
    .maybeSingle();

  await client.auth.signOut();

  const isAdmin =
    authUser?.user_metadata?.isAdmin === true ||
    profile?.role === 'admin';

  return {
    ok: Boolean(isAdmin),
    reason: profileErr?.message,
    metadataRole: authUser?.user_metadata?.role,
    profileRole: profile?.role,
  };
}

async function run() {
  console.log('============================================================');
  console.log('Balay Urios -> create / promote admin');
  console.log(`   Project : ${SUPABASE_URL}`);
  console.log(`   Email   : ${email}`);
  console.log(`   Name    : ${name}`);
  console.log('============================================================\n');

  const { user, created } = await ensureAuthUser();
  console.log(created ? 'Created new Supabase Auth user.' : 'Found existing Supabase Auth user — password reset.');

  const profile = await ensureAdminProfile(user);
  if (!profile) throw new Error('Could not read back the public.users profile.');
  if (profile.id !== user.id) {
    throw new Error(
      `Profile id mismatch: users.id=${profile.id} but auth id=${user.id}. ` +
      'Check for a duplicate users row with this email.'
    );
  }
  console.log(`public.users row ready  ->  role=${profile.role}  name=${profile.name}`);

  const verdict = await verifyAppResolution();
  if (verdict.skipped) {
    console.log('Skipped sign-in verification (no VITE_SUPABASE_ANON_KEY).');
  } else if (verdict.ok) {
    console.log(
      `Sign-in verified        ->  metadata.role=${verdict.metadataRole}, ` +
      `users.role=${verdict.profileRole}  ==>  resolves to ADMIN`
    );
  } else {
    console.warn(`Sign-in verification FAILED: ${verdict.reason || 'account did not resolve as admin'}`);
  }

  if (!passwordArg) {
    console.log('\n------------------------------------------------------------');
    console.log(' Generated password (shown once — store it, then change it):');
    console.log(`   ${password}`);
    console.log('------------------------------------------------------------');
  }

  console.log('\nNext: open the app -> Sign In -> use the email/password above.');
  console.log('An "Auditor" tab appears once the account resolves as admin.\n');
}

run().catch((err) => {
  console.error('\nFailed:', err?.message || err);
  process.exit(1);
});
