/**
 * src/services/api.js
 * Balay Urios (Serjon) – Supabase Auth & PostgreSQL Client
 *
 * Authentication is strictly and securely handled by Supabase Auth (supabase.auth).
 * Database operations interact with live Supabase PostgreSQL tables.
 */

import { supabase } from '../lib/supabase';
import { getGateDistance } from '../utils/distance';

// ─── Typed Error ─────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Helper: JSON parsing ────────────────────────────────────────────────────

const JSON_FIELDS = [
  'landlord',
  'images',
  'gateProximities',
  'badges',
  'mapCoordinates',
  'floodRating',
  'waterSystem',
  'powerSystem',
  'wifiAudit',
  'commuteSteps',
  'amenities',
  'rules',
  'vibeChecks',
  'povRoute',
  'gates',
  'zones'
];

function sanitizeRow(row) {
  if (!row) return row;
  const copy = { ...row };
  for (const f of JSON_FIELDS) {
    if (typeof copy[f] === 'string') {
      try {
        copy[f] = JSON.parse(copy[f]);
      } catch {
        // preserve
      }
    }
  }
  return copy;
}

function toCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function publicUser(row) {
  if (!row) return null;
  const { passwordHash: _, ...safe } = row;
  if (safe.isAdmin || safe.role === 'admin') {
    safe.role = 'admin';
    safe.isAdmin = true;
  }
  if (safe.isUriosVerified !== undefined || safe.verificationStatus !== undefined) {
    safe.isUriosVerified =
      Boolean(safe.isUriosVerified) || safe.verificationStatus === 'verified';
  }
  if (!safe.verificationStatus) {
    safe.verificationStatus = safe.isUriosVerified ? 'verified' : 'pending';
  }
  return safe;
}

// Columns added by supabase/add-landlord-verification.sql. Querying them on a
// database that has not run the migration would fail, so all landlord reads
// fall back to the base profile columns.
const LANDLORD_VERIFICATION_COLUMNS = [
  'isUriosVerified',
  'verificationStatus',
  'verifiedAt',
  'verifiedBy',
  'verificationNotes'
];

// Public social handles added by supabase/add-social-links.sql.
const SOCIAL_COLUMNS = ['facebook', 'instagram', 'twitter'];

// Public, non-sensitive read path for landlord rows (supabase/rls-harden.sql).
// The property feed paints the "Urios Verified" badge even for signed-out
// visitors, and anon no longer has SELECT on the private `users` table.
const LANDLORD_DIRECTORY_SOURCE = 'landlord_directory';

function socialsOf(row) {
  if (!row) return { facebook: null, instagram: null, twitter: null };
  return {
    facebook: row.facebook || null,
    instagram: row.instagram || null,
    twitter: row.twitter || null
  };
}

function landlordVerificationOf(row) {
  if (!row) return null;
  const isVerified =
    Boolean(row.isUriosVerified) || row.verificationStatus === 'verified';
  return {
    isUriosVerified: isVerified,
    verificationStatus: row.verificationStatus || (isVerified ? 'verified' : 'pending'),
    verifiedAt: row.verifiedAt || null,
    verifiedBy: row.verifiedBy || null,
    verificationNotes: row.verificationNotes || ''
  };
}

async function getUserCandidateIds(authUser) {
  const ids = new Set();
  if (authUser?.id) ids.add(authUser.id);

  if (authUser?.email) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('email', authUser.email.toLowerCase().trim())
        .maybeSingle();

      if (profile?.id) ids.add(profile.id);
    } catch {
      // ignore
    }
  }

  return Array.from(ids);
}

// ─── Landlord ownership helpers ──────────────────────────────────────────────
//
// Ownership of a listing is stored in the `properties.landlord` JSONB column:
//   landlord.userId  -> the auth user id (durable link, matches RLS)
//   landlord.email   -> fallback for legacy rows (matched case-insensitively)
//   users.propertyId -> last-resort pointer for single-listing landlords
//
// EVERY place that decides "is this MY listing?" must route through these
// helpers so that the My Listings view agrees with the database. This is what
// keeps the landlord hub in sync with Supabase.

function normalizeId(value) {
  if (value === null || value === undefined || value === '') return null;
  return String(value).toLowerCase();
}

// Detects a PostgREST/Postgres "column does not exist" error so writes can
// degrade gracefully on a project whose schema has not been migrated yet.
function isMissingColumnError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return error.code === '42703' || message.includes('does not exist') || message.includes('column');
}

// Messaging writes fail loudly when supabase/add-messaging.sql has not been
// run yet; surface that installation step instead of a bare PostgREST error.
// "permission denied"/RLS errors mean the messaging policies were dropped
// (re-running the older full-setup.sql / rls-policies.sql used to do that).
function messagingError(error, fallback = 'Messaging request failed.') {
  const message = error?.message || fallback;
  const needsMigration = /does not exist|schema cache|could not find the (table|function)/i.test(message);
  const needsPolicies = /permission denied|row-level security|rls policy/i.test(message);

  return new ApiError(
    needsMigration
      ? `${message} Run supabase/add-messaging.sql in Supabase first.`
      : needsPolicies
        ? `${message} Run supabase/add-messaging.sql in Supabase to restore the messaging policies.`
        : message,
    500
  );
}

// Insert an application row, retrying without `status` when the column is
// missing (pre-migration projects). Returns the Supabase insert result.
async function insertTenancyRow(record) {
  let res = await supabase.from('tenancy').insert([record]).select().maybeSingle();
  if (res.error && isMissingColumnError(res.error)) {
    const { status: _status, ...legacy } = record;
    res = await supabase.from('tenancy').insert([legacy]).select().maybeSingle();
  }
  return res;
}

// Update a single tenancy, retrying without `status` when the column is
// missing (pre-migration projects). Returns the Supabase update result.
async function updateTenancyRow(tenancyId, payload) {
  let res = await supabase
    .from('tenancy')
    .update(payload)
    .eq('id', tenancyId)
    .select()
    .maybeSingle();
  if (res.error && isMissingColumnError(res.error)) {
    const { status: _status, ...legacy } = payload;
    res = await supabase
      .from('tenancy')
      .update(legacy)
      .eq('id', tenancyId)
      .select()
      .maybeSingle();
  }
  return res;
}

async function getAuthIdentity() {
  try {
    const { data } = await supabase.auth.getUser();
    const authUser = data?.user;
    if (!authUser) return null;

    const identity = {
      id: authUser.id ? String(authUser.id) : null,
      email: authUser.email ? String(authUser.email).toLowerCase().trim() : null,
      name: authUser.user_metadata?.name || null,
      propertyId: null
    };

    // Resolve the profile row's propertyId pointer (legacy single-listing link).
    if (identity.email) {
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('propertyId')
          .eq('email', identity.email)
          .maybeSingle();
        identity.propertyId = profile?.propertyId || null;
      } catch {
        identity.propertyId = null;
      }
    }

    return identity;
  } catch {
    return null;
  }
}

/**
 * Canonical ownership test. `identity` is `{ id, email, propertyId }` and may
 * come from `getAuthIdentity()` (live auth) or the in-memory `user` object.
 */
export function landlordOwnsProperty(prop, identity) {
  if (!prop || !identity) return false;
  const landlord = prop.landlord || {};

  if (identity.id && landlord.userId && normalizeId(landlord.userId) === normalizeId(identity.id)) {
    return true;
  }
  if (identity.email && landlord.email && normalizeId(landlord.email) === normalizeId(identity.email)) {
    return true;
  }
  // Legacy single-listing pointer — only honored as a final fallback so a
  // stale propertyId can never claim a listing that belongs to someone else.
  if (identity.propertyId && prop.id === identity.propertyId) {
    return true;
  }
  return false;
}

/**
 * Strict account match for "is this landlord JSON me?" — used before opening a
 * chat so nobody can message themselves. Unlike `landlordOwnsProperty` this
 * deliberately ignores the legacy `users.propertyId` pointer: a boarder's
 * profile carries the pad they board, and that must never be read as ownership.
 */
export function landlordMatchesAccount(landlord, identity) {
  if (!landlord || !identity) return false;

  if (identity.id && landlord.userId && normalizeId(landlord.userId) === normalizeId(identity.id)) {
    return true;
  }
  if (identity.email && landlord.email && normalizeId(landlord.email) === normalizeId(identity.email)) {
    return true;
  }
  return false;
}

// ─── Pure Supabase API Surface ───────────────────────────────────────────────

export const api = {
  // ── Landlord account verification ─────────────────────────────────────────

  /**
   * Builds lookup indexes of landlord account verification records. Used to
   * decorate every property's `landlord` object with the admin-approved
   * "Urios Verified" state without mutating the stored JSON.
   */
  async _getLandlordVerificationIndex() {
    const baseColumns = 'id, name, email, role';
    const withVerification = `${baseColumns}, ${LANDLORD_VERIFICATION_COLUMNS.join(', ')}`;
    const withEverything = `${withVerification}, ${SOCIAL_COLUMNS.join(', ')}`;

    // Try the full row first (verification + socials), then fall back to
    // verification-only, then to the original base columns so this keeps
    // working on projects that have not run the migrations yet.
    let { data, error } = await supabase
      .from(LANDLORD_DIRECTORY_SOURCE)
      .select(withEverything)
      .eq('role', 'landlord');

    // Projects that have not run supabase/rls-harden.sql have no view yet, so
    // fall back to the table (the pre-migration behaviour).
    if (error) {
      ({ data, error } = await supabase
        .from('users')
        .select(withEverything)
        .eq('role', 'landlord'));
    }

    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase
        .from('users')
        .select(withVerification)
        .eq('role', 'landlord'));
    }

    // Backward compatibility for projects that have not run
    // supabase/add-landlord-verification.sql yet.
    if (error && isMissingColumnError(error)) {
      ({ data, error } = await supabase
        .from('users')
        .select(baseColumns)
        .eq('role', 'landlord'));
    }

    if (error) {
      console.warn('[Supabase landlord verification index warning]:', error.message);
      return null;
    }

    const byId = new Map();
    const byEmail = new Map();
    const byName = new Map();

    for (const row of data || []) {
      const verification = landlordVerificationOf(row);
      const value = {
        userId: row.id,
        email: row.email || null,
        ...verification,
        ...socialsOf(row)
      };
      if (row.id) byId.set(normalizeId(row.id), value);
      if (row.email) byEmail.set(normalizeId(row.email), value);
      if (row.name) byName.set(normalizeId(row.name), value);
    }

    return { byId, byEmail, byName };
  },

  async _attachLandlordVerifications(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;

    const index = await this._getLandlordVerificationIndex();
    if (!index) return rows;

    return rows.map(prop => {
      const landlord = prop?.landlord;
      if (!landlord) return prop;

      const match =
        (landlord.userId && index.byId.get(normalizeId(landlord.userId))) ||
        (landlord.email && index.byEmail.get(normalizeId(landlord.email))) ||
        (landlord.name && index.byName.get(normalizeId(landlord.name))) ||
        null;

      if (!match) return prop;

      return {
        ...prop,
        landlord: {
          ...landlord,
          userId: landlord.userId || match.userId,
          isUriosVerified: match.isUriosVerified,
          verificationStatus: match.verificationStatus,
          verifiedAt: match.verifiedAt,
          verifiedBy: match.verifiedBy,
          verificationNotes: match.verificationNotes,
          facebook: match.facebook || landlord.facebook || null,
          instagram: match.instagram || landlord.instagram || null,
          twitter: match.twitter || landlord.twitter || null
        }
      };
    });
  },

  /**
   * Overlay each property with the aggregate of its STUDENT ratings.
   *
   * Only rows in `property_reviews` count, so legacy/demo `rating` values on
   * the property row can never masquerade as a boarder's rating. Properties
   * with no reviews report 0 / 0 and the UI renders "No ratings yet".
   */
  async _attachStudentRatings(rows = []) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;

    const ids = rows.map(row => row?.id).filter(Boolean);
    if (ids.length === 0) return rows;

    const withNoRatings = (list) => list.map(row => ({ ...row, rating: 0, reviewCount: 0 }));
    const buckets = new Map();

    try {
      const { data, error } = await supabase
        .from('property_reviews')
        .select('propertyId, rating')
        .in('propertyId', ids);

      if (error || !Array.isArray(data)) return withNoRatings(rows);

      for (const review of data) {
        const key = String(review.propertyId);
        const bucket = buckets.get(key) || { total: 0, count: 0 };
        bucket.total += Number(review.rating) || 0;
        bucket.count += 1;
        buckets.set(key, bucket);
      }
    } catch {
      // A project that has not run supabase/add-property-reviews.sql simply
      // shows no ratings instead of failing the whole feed.
      return withNoRatings(rows);
    }

    return rows.map(row => {
      const bucket = buckets.get(String(row?.id));
      const count = bucket?.count || 0;
      return {
        ...row,
        rating: count ? Number((bucket.total / count).toFixed(1)) : 0,
        reviewCount: count
      };
    });
  },

  /**
   * Raw landlord profile rows for the Auditor tab.
   *
   * `public.users` is a profile copy of Supabase Auth, not a child table with a
   * foreign key to `auth.users`, so deleting an account in Authentication used
   * to leave its profile (and its valid-ID row) behind — a ghost entry in the
   * audit that can never sign in again.
   *
   * `public.live_landlord_accounts()` (from supabase/fix-deleted-accounts.sql)
   * reads through `auth.users` and only returns accounts that still exist, so
   * the audit is always anchored to the authentication source of truth. The
   * RPC is admin-only; on projects that have not run that migration it is simply
   * missing and this falls back to the plain table read (the same data the old
   * code used).
   */
  async _readLandlordAccounts() {
    try {
      const { data, error } = await supabase.rpc('live_landlord_accounts');
      if (!error && Array.isArray(data)) return data;

      if (error) {
        const missingFunction = /could not find the function|schema cache|does not exist/i
          .test(error.message || '');
        if (!missingFunction) {
          console.warn('[Supabase live_landlord_accounts warning]:', error.message);
        }
      }
    } catch (err) {
      console.warn('[Supabase live_landlord_accounts exception]:', err.message);
    }

    // `select('*')` never fails when the optional verification columns have not
    // been migrated yet; rows simply lack those fields and normalize to pending.
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'landlord');

    if (error) {
      console.error('[Supabase getLandlords error]:', error.message);
      throw new ApiError(`Failed to load landlord accounts: ${error.message}`, 500);
    }

    return data || [];
  },

  /**
   * All landlord accounts, for the Auditor tab. Returns public profile rows
   * (password hashes removed) including their verification state.
   *
   * The Urios Verified badge is derived from the ID review, never taken at face
   * value from `users.isUriosVerified`: an account whose valid ID is not
   * `approved` is returned as pending, so the Auditor tab can never show
   * "URIOS VERIFIED" next to "No ID submitted".
   */
  async getLandlords() {
    const [rows, idStatuses] = await Promise.all([
      this._readLandlordAccounts(),
      this.getLandlordIdStatuses()
    ]);

    return rows
      .map(row => this._applyValidIdGate(publicUser(row), idStatuses))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  },

  /**
   * Applies the "no approved ID → no Urios Verified badge" rule to a user row
   * using a `{ userId: landlord_ids row }` map. Always attaches `validIdStatus`
   * so the UI can show which verification step is missing.
   */
  _applyValidIdGate(user, idStatuses = {}) {
    if (!user) return user;

    const record = idStatuses?.[String(user.id)] || null;
    const validIdStatus = record?.status || 'missing';

    if (!user.isUriosVerified) return { ...user, validIdStatus };
    if (validIdStatus === 'approved') return { ...user, validIdStatus };

    return {
      ...user,
      validIdStatus,
      isUriosVerified: false,
      verificationStatus: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      verificationNotes: 'Verification cleared — the valid ID is not approved.'
    };
  },

  /**
   * Same rule for the signed-in landlord's own profile (RLS lets them read
   * their own ID row). Only landlords are checked, and only when the stored
   * flag claims verification.
   */
  async _applyOwnValidIdGate(user) {
    if (!user || !user.isUriosVerified) return user;
    if (user.role !== 'landlord') return user;

    const { record } = await this._landlordIdReviewState(user.id);
    if (record?.status === 'approved') return user;

    return {
      ...user,
      validIdStatus: record?.status || 'missing',
      isUriosVerified: false,
      verificationStatus: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      verificationNotes: 'Verification pending — the valid ID is not approved.'
    };
  },
  /**
   * Admin-only approval of a landlord account as "Urios Verified".
   * Updates public.users; RLS `users_update` already allows admins.
   *
   * VERIFICATION ORDER — step 2 of 2.
   * Step 1 is the valid-ID review in `public.landlord_ids`. Approving the
   * account is only allowed once that ID is `approved` and has a photo on file,
   * so no UI (or direct API call) can hand out the badge without an ID check.
   * supabase/add-verification-workflow.sql enforces the same rule in the DB.
   * Revoking (isUriosVerified = false) is always allowed.
   */
  async verifyLandlordAccount(userId, auditData = {}) {
    if (!userId) throw new ApiError('Landlord account id is required.', 400);

    const isVerified = Boolean(auditData.isUriosVerified);

    if (isVerified) {
      const gate = await this._landlordIdReviewState(userId);
      const idStatus = gate.record?.status || 'missing';

      if (gate.missingTable) {
        throw new ApiError(
          'The valid-ID table could not be read, so the ID cannot be verified. Run supabase/add-landlord-valid-id.sql in Supabase first.',
          409
        );
      }

      if (idStatus !== 'approved') {
        throw new ApiError(
          idStatus === 'missing'
            ? 'This landlord has no valid ID on file. Submit and approve their ID (step 1) before approving the account.'
            : `This landlord's valid ID is still ${idStatus}. Approve the ID first (step 1), then approve the account.`,
          409
        );
      }

      if (!gate.record?.frontImagePath && !gate.record?.backImagePath) {
        throw new ApiError(
          'The approved ID record has no photo on file, so there is nothing to verify. Ask the landlord to resubmit a photo of their ID.',
          409
        );
      }
    }

    const basePayload = {
      verificationStatus:
        auditData.verificationStatus || (isVerified ? 'verified' : 'pending'),
      verifiedAt: isVerified ? (auditData.verifiedAt || new Date().toISOString()) : null,
      verifiedBy: isVerified
        ? (auditData.verifiedBy || auditData.auditorName || 'FSUU Housing Committee Admin')
        : null,
      verificationNotes: auditData.verificationNotes ?? auditData.auditNotes ?? ''
    };

    // Older projects created `isUriosVerified` as an integer (0/1). New
    // projects use boolean. Try the native boolean first, then fall back to
    // 1/0 only when PostgREST reports a type mismatch for that column.
    const attempts = [
      { ...basePayload, isUriosVerified: isVerified },
      { ...basePayload, isUriosVerified: isVerified ? 1 : 0 }
    ];

    let lastError = null;
    for (const payload of attempts) {
      const { data, error } = await supabase
        .from('users')
        .update(payload)
        .eq('id', userId)
        .select('*')
        .maybeSingle();

      if (!error) {
        if (!data) {
          throw new ApiError('Landlord account not found or you do not have admin permission.', 404);
        }
        return publicUser(data);
      }

      lastError = error;
      const isTypeMismatch = /isUriosVerified|boolean|integer|invalid input/i.test(error.message || '');
      if (!isTypeMismatch) break;
    }

    const hint = isMissingColumnError(lastError)
      ? ' Run supabase/add-landlord-verification.sql in Supabase first.'
      : '';
    console.error('[Supabase verifyLandlordAccount error]:', lastError?.message);
    throw new ApiError(
      `Failed to save landlord verification: ${lastError?.message || 'Unknown error'}.${hint}`,
      500
    );
  },

  // ── Landlord valid ID (private: owner + admin/auditor only) ───────────────
  //
  // Rows live in public.landlord_ids and photos in the private
  // `landlord-ids` storage bucket. RLS in supabase/add-landlord-valid-id.sql
  // makes them readable ONLY by the owning landlord and admins/auditors.

  async _currentAuthUserId() {
    try {
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ? String(data.user.id) : null;
    } catch {
      return null;
    }
  },

  async _withLandlordIdImageUrls(row) {
    if (!row) return null;

    const signedUrlFor = async (path) => {
      if (!path) return null;
      try {
        const { data } = await supabase.storage
          .from('landlord-ids')
          .createSignedUrl(path, 60 * 10);
        return data?.signedUrl || null;
      } catch {
        return null;
      }
    };

    const [frontImageUrl, backImageUrl] = await Promise.all([
      signedUrlFor(row.frontImagePath),
      signedUrlFor(row.backImagePath)
    ]);

    return { ...row, frontImageUrl, backImageUrl };
  },

  /**
   * Lightweight read of one landlord's ID review state, used by the step-2
   * account-approval guard. Unlike `getLandlordId` this does not mint signed
   * photo URLs and never throws: a missing table is reported so the caller can
   * prompt for supabase/add-landlord-valid-id.sql.
   */
  async _landlordIdReviewState(userId) {
    if (!userId) return { record: null, missingTable: false };

    const { data, error } = await supabase
      .from('landlord_ids')
      .select('status, frontImagePath, backImagePath, reviewedAt, reviewedBy')
      .eq('userId', String(userId))
      .maybeSingle();

    if (error) {
      if (!isMissingColumnError(error)) {
        console.warn('[Supabase _landlordIdReviewState error]:', error.message);
      }
      return { record: null, missingTable: true };
    }

    return { record: data || null, missingTable: false };
  },

  /**
   * ID review state for every landlord, keyed by userId. Used by the Auditor
   * tab so the ID gate (and the step that is still missing) is visible in the
   * landlord list instead of only after opening the profile.
   * Returns `{}` when the table has not been migrated yet.
   */
  async getLandlordIdStatuses() {
    try {
      const { data, error } = await supabase
        .from('landlord_ids')
        .select('userId, status, submittedAt, reviewedAt, reviewedBy, frontImagePath, backImagePath');

      if (error) {
        if (!isMissingColumnError(error)) {
          console.warn('[Supabase getLandlordIdStatuses error]:', error.message);
        }
        return {};
      }

      const byUser = {};
      for (const row of data || []) {
        if (!row?.userId) continue;
        byUser[String(row.userId)] = row;
      }
      return byUser;
    } catch {
      return {};
    }
  },

  /**
   * The valid-ID record for a landlord. RLS only returns it to the landlord
   * who owns it or to an admin/auditor. Returns null when nothing is on file
   * (or when supabase/add-landlord-valid-id.sql has not been run yet).
   */
  async getLandlordId(userId) {
    const targetId = userId ? String(userId) : await this._currentAuthUserId();
    if (!targetId) return null;

    const { data, error } = await supabase
      .from('landlord_ids')
      .select('*')
      .eq('userId', targetId)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error)) {
        console.warn('[Supabase getLandlordId] table missing – run supabase/add-landlord-valid-id.sql');
        return null;
      }
      console.warn('[Supabase getLandlordId error]:', error.message);
      return null;
    }

    return this._withLandlordIdImageUrls(data);
  },

  /**
   * Uploads one ID photo into the private bucket, under the signed-in
   * landlord's own folder (required by the storage RLS policy).
   * Returns the storage path to save on the landlord_ids row.
   */
  async uploadLandlordIdImage(file, side = 'front') {
    if (!file) return null;

    const authId = await this._currentAuthUserId();
    if (!authId) {
      throw new ApiError('You must be signed in to upload a valid ID.', 401);
    }

    const safeName = String(file.name || 'id.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
    const ext = safeName.includes('.') ? safeName.split('.').pop() : 'jpg';
    const path = `${authId}/${side}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('landlord-ids')
      .upload(path, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg'
      });

    if (error) {
      const hint = /bucket|not found/i.test(error.message || '')
        ? ' Run supabase/add-landlord-valid-id.sql in Supabase first.'
        : '';
      throw new ApiError(`Could not upload the ID photo: ${error.message}.${hint}`, 500);
    }

    return path;
  },

  /**
   * Creates/updates the signed-in landlord's ID submission. The row is reset
   * to `pending` so an auditor reviews any new photo or ID number, and an
   * already-verified account is paused until that review finishes.
   */
  async submitLandlordId(data = {}) {
    const authId = await this._currentAuthUserId();
    if (!authId) {
      throw new ApiError('You must be signed in to submit a valid ID.', 401);
    }

    const userId = data.userId ? String(data.userId) : authId;
    const idNumber = String(data.idNumber || '').trim();
    if (!idNumber) {
      throw new ApiError('Please enter your ID number.', 400);
    }

    // A number alone cannot be verified — auditors must be able to compare the
    // typed details against a photo of the physical ID.
    if (!data.frontImagePath && !data.backImagePath) {
      throw new ApiError(
        'Attach a photo of the front of your valid ID before submitting. Auditors need to see the ID, not just the number.',
        400
      );
    }

    const payload = {
      userId,
      fullName: data.fullName?.trim() || null,
      idType: data.idType?.trim() || 'Philippine National ID (PhilSys)',
      idNumber,
      frontImagePath: data.frontImagePath || null,
      backImagePath: data.backImagePath || null,
      status: 'pending',
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { data: row, error } = await supabase
      .from('landlord_ids')
      .upsert(payload, { onConflict: 'userId' })
      .select('*')
      .maybeSingle();

    if (error) {
      const needsPolicies = error.code === '42501'
        || /row-level security|permission denied/i.test(error.message || '');
      const hint = isMissingColumnError(error)
        ? ' Run supabase/add-landlord-valid-id.sql in Supabase first.'
        : needsPolicies
          ? ' The landlord_ids policies are missing — re-run supabase/add-landlord-valid-id.sql in Supabase.'
          : '';
      console.error('[Supabase submitLandlordId error]:', error.message);
      throw new ApiError(`Failed to save your valid ID: ${error.message}.${hint}`, 500);
    }

    // A fresh submission resets the ID to `pending`, so any badge granted on the
    // previous ID has to pause until an auditor approves the new evidence.
    let accountVerificationRevoked = false;
    try {
      const { data: account } = await supabase
        .from('users')
        .select('id, isUriosVerified, verificationStatus')
        .eq('id', String(userId))
        .maybeSingle();

      const wasVerified = account
        && (account.isUriosVerified === true
          || account.isUriosVerified === 1
          || account.verificationStatus === 'verified');

      if (wasVerified) {
        await this.verifyLandlordAccount(userId, {
          isUriosVerified: false,
          verificationStatus: 'pending',
          verificationNotes: 'Verification paused — a new valid ID was submitted and is awaiting review.'
        });
        accountVerificationRevoked = true;
      }
    } catch (revokeError) {
      console.warn('[Supabase submitLandlordId] could not pause verification:', revokeError?.message);
    }

    const record = await this._withLandlordIdImageUrls(row);
    return record ? { ...record, accountVerificationRevoked } : record;
  },

  /**
   * Admin/auditor review of a submitted ID — step 1 of 2.
   *
   * Approving the ID does NOT verify the account; that stays a separate,
   * explicit step 2 (`verifyLandlordAccount`). Rejecting the ID is the one
   * direction that does affect the account: an existing Urios Verified badge is
   * revoked, because the evidence behind it no longer holds.
   * The returned record carries `accountVerificationRevoked` for the UI.
   */
  async reviewLandlordId(userId, review = {}) {
    if (!userId) throw new ApiError('Landlord account id is required.', 400);

    const status = review.status === 'approved' ? 'approved'
      : review.status === 'rejected' ? 'rejected'
      : 'pending';

    const reviewNotes = String(review.reviewNotes || '').trim();

    if (status === 'rejected' && !reviewNotes) {
      throw new ApiError(
        'Add a short reason for rejecting the ID. It is shown to the landlord so they can fix the submission.',
        400
      );
    }

    const { data, error } = await supabase
      .from('landlord_ids')
      .update({
        status,
        reviewedAt: new Date().toISOString(),
        reviewedBy: review.reviewedBy || 'FSUU Housing Committee Admin',
        reviewNotes,
        updatedAt: new Date().toISOString()
      })
      .eq('userId', String(userId))
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('[Supabase reviewLandlordId error]:', error.message);
      throw new ApiError(`Failed to update the ID review: ${error.message}`, 500);
    }

    let accountVerificationRevoked = false;

    if (status === 'rejected' && data) {
      // Best-effort: never fail the ID review because the badge cleanup (or a
      // not-yet-migrated users table) failed.
      try {
        const { data: account } = await supabase
          .from('users')
          .select('id, isUriosVerified, verificationStatus')
          .eq('id', String(userId))
          .maybeSingle();

        const wasVerified = account
          && (account.isUriosVerified === true
            || account.isUriosVerified === 1
            || account.verificationStatus === 'verified');

        if (wasVerified) {
          await this.verifyLandlordAccount(userId, {
            isUriosVerified: false,
            verificationStatus: 'pending',
            verificationNotes: `Verification revoked — valid ID rejected: ${reviewNotes}`
          });
          accountVerificationRevoked = true;
        }
      } catch (revokeError) {
        console.warn('[Supabase reviewLandlordId] could not revoke verification:', revokeError?.message);
      }
    }

    const record = await this._withLandlordIdImageUrls(data);
    return record ? { ...record, accountVerificationRevoked } : record;
  },

  // ── Properties ────────────────────────────────────────────────────────────

  async getProperties(params = {}) {
    const { data, error } = await supabase
      .from('properties')
      .select('*');

    if (error) {
      console.error('[Supabase getProperties error]:', error.message);
      throw new ApiError(`Supabase error: ${error.message}`, 500);
    }

    const formatted = await this._attachLandlordVerifications(
      await this._attachStudentRatings((data || []).map(sanitizeRow))
    );
    return this._filterProperties(formatted, params);
  },

  _filterProperties(all, params = {}) {
    const {
      search,
      campusId,
      gate,
      zone,
      minWalkMinutes,
      maxWalkMinutes,
      minDistanceMeters,
      maxDistanceMeters,
      floodFree,
      powerBackup,
      boosterPump,
      mobile5GOnly,
      mobileProvider,
      fastWifiOnly,
      minWifiSpeed,
      maxBudget,
      roomType,
      amenities,
      sortBy
    } = params;

    let list = [...all];

    // Search query: matches pad name, area, zone, room, gender, landlord, ALL amenities, and checklist items
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => {
        // Basic fields
        if (p.name?.toLowerCase().includes(q)) return true;
        if (p.area?.toLowerCase().includes(q)) return true;
        if (p.zone?.toLowerCase().includes(q)) return true;
        if (p.roomType?.toLowerCase().includes(q)) return true;
        if (p.gender?.toLowerCase().includes(q)) return true;
        if ((p.landlord?.name || '').toLowerCase().includes(q)) return true;

        // Amenities search
        if (Array.isArray(p.amenities)) {
          const matchAmenity = p.amenities.some(a => {
            const str = typeof a === 'string' ? a : (a?.name || '');
            return str.toLowerCase().includes(q);
          });
          if (matchAmenity) return true;
        }

        // Checklist: Flood rating
        const floodText = `${p.floodRating?.badge || ''} ${p.floodRating?.tagBadge || ''} ${p.floodRating?.description || ''} ${p.floodRating?.elevation || ''}`.toLowerCase();
        if (floodText.includes(q) || (q.includes('flood') && p.floodRating?.isFloodFree)) return true;

        // Checklist: Water system
        const waterText = `${p.waterSystem?.badge || ''} ${p.waterSystem?.tankCapacity || ''} ${p.waterSystem?.description || ''}`.toLowerCase();
        if (waterText.includes(q) || (q.includes('booster') && p.waterSystem?.hasBoosterPump) || (q.includes('tank') && p.waterSystem?.hasReserveTank)) return true;

        // Checklist: Power system
        const powerText = `${p.powerSystem?.badge || ''} ${p.powerSystem?.description || ''}`.toLowerCase();
        if (powerText.includes(q) || (q.includes('solar') && p.powerSystem?.hasSolarBackup) || (q.includes('generator') && p.powerSystem?.hasGenerator)) return true;

        // Checklist: Wi-Fi & Carrier signals
        const carriers = p.wifiAudit?.carrierSignals || {};
        const carrierStr = Object.entries(carriers).map(([k, v]) => `${k} ${v}`).join(' ').toLowerCase();
        const wifiText = `${p.wifiAudit?.provider || ''} ${p.wifiAudit?.badge || ''} ${p.wifiAudit?.ratingBadge || ''} ${carrierStr}`.toLowerCase();
        if (wifiText.includes(q)) return true;

        // Checklist: Gate proximities & commute
        const gateText = `${p.gateProximities?.mainSFGate?.label || ''} ${p.gateProximities?.jcAquinoGate?.label || ''} ${p.gateProximities?.primaryGate || ''}`.toLowerCase();
        if (gateText.includes(q)) return true;

        // House rules
        if (Array.isArray(p.rules)) {
          const matchRule = p.rules.some(r => {
            const str = typeof r === 'string' ? r : `${r.title || ''} ${r.desc || ''}`;
            return str.toLowerCase().includes(q);
          });
          if (matchRule) return true;
        }

        return false;
      });
    }

    // Amenities filter
    if (amenities) {
      const required = Array.isArray(amenities) ? amenities : String(amenities).split(',').map(s => s.trim()).filter(Boolean);
      if (required.length > 0) {
        list = list.filter(p => {
          const propAmenityNames = (p.amenities || []).map(a =>
            (typeof a === 'string' ? a : a?.name || '').toLowerCase()
          );
          return required.every(req =>
            propAmenityNames.some(name => name.includes(req.toLowerCase()))
          );
        });
      }
    }

    // Campus
    if (campusId && campusId !== 'all') {
      list = list.filter(p => p.campusId === campusId);
    }

    // Gate
    if (gate && gate !== 'all') {
      list = list.filter(p => p.gateProximities?.primaryGate === gate);
    }

    // Zone
    if (zone && zone !== 'All Zones') {
      list = list.filter(p => p.zone === zone);
    }

    // Checklist filters. Normalize through getGateDistance so a pad that stored
    // only walking minutes (or only metres) is filtered on its derived value
    // instead of being treated as a 0-minute / 0-metre pad.
    const walkMinutesOf = (p) => getGateDistance(p)?.walkMinutes || 99;
    const metersOf = (p) => getGateDistance(p)?.meters || 9999;

    if (minWalkMinutes) {
      const minMins = Number(minWalkMinutes);
      if (!isNaN(minMins) && minMins > 0) {
        list = list.filter(p => walkMinutesOf(p) >= minMins);
      }
    }

    if (maxWalkMinutes) {
      const maxMins = Number(maxWalkMinutes);
      if (!isNaN(maxMins) && maxMins > 0) {
        list = list.filter(p => walkMinutesOf(p) <= maxMins);
      }
    }

    if (minDistanceMeters) {
      const minD = Number(minDistanceMeters);
      if (!isNaN(minD) && minD > 0) {
        list = list.filter(p => metersOf(p) >= minD);
      }
    }

    if (maxDistanceMeters) {
      const maxD = Number(maxDistanceMeters);
      if (!isNaN(maxD) && maxD > 0) {
        list = list.filter(p => metersOf(p) <= maxD);
      }
    }

    if (floodFree === 'true' || floodFree === true) {
      list = list.filter(p => p.floodRating?.isFloodFree && !p.floodRating?.badge?.toLowerCase().includes('none'));
    }

    if (boosterPump === 'true' || boosterPump === true) {
      list = list.filter(p => p.waterSystem?.hasBoosterPump && p.waterSystem?.hasReserveTank && !p.waterSystem?.badge?.toLowerCase().includes('none'));
    }

    if (powerBackup === 'true' || powerBackup === true) {
      list = list.filter(p => (p.powerSystem?.hasSolarBackup || p.powerSystem?.hasGenerator) && !p.powerSystem?.badge?.toLowerCase().includes('none'));
    }

    if (mobile5GOnly === 'true' || mobile5GOnly === true) {
      list = list.filter(p => {
        const carriers = p.wifiAudit?.carrierSignals || {};
        const g = (carriers.globe || '').toLowerCase();
        const s = (carriers.smart || '').toLowerCase();
        const d = (carriers.dito || '').toLowerCase();
        return g.includes('5g') || s.includes('5g') || d.includes('5g');
      });
    }

    if (mobileProvider && mobileProvider !== 'all') {
      const prov = mobileProvider.toLowerCase();
      list = list.filter(p => {
        const carriers = p.wifiAudit?.carrierSignals || {};
        const str = (carriers[prov] || '').toLowerCase();
        return str.includes('5g') || str.includes('full') || str.includes('4 bars') || str.includes('5 bars') || str.includes('solid');
      });
    }

    if (fastWifiOnly === 'true' || fastWifiOnly === true) {
      list = list.filter(p => p.wifiAudit?.hasWifi !== false && !p.wifiAudit?.provider?.toLowerCase().includes('none') && (Number(p.wifiAudit?.downloadMbps) || 0) >= 50);
    }

    if (minWifiSpeed) {
      const minMbps = Number(minWifiSpeed);
      if (!isNaN(minMbps) && minMbps > 0) {
        list = list.filter(p => p.wifiAudit?.hasWifi !== false && !p.wifiAudit?.provider?.toLowerCase().includes('none') && (Number(p.wifiAudit?.downloadMbps) || 0) >= minMbps);
      }
    }

    if (maxBudget) {
      const budgetNum = Number(maxBudget);
      if (!isNaN(budgetNum) && budgetNum > 0 && budgetNum < 8000) {
        list = list.filter(p => p.price <= budgetNum);
      }
    }

    if (roomType && roomType !== 'All') {
      list = list.filter(p => p.roomType?.toLowerCase().includes(roomType.toLowerCase()));
    }

    // Sorting
    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      list.sort((a, b) => {
        const distA = getGateDistance(a)?.meters || 9999;
        const distB = getGateDistance(b)?.meters || 9999;
        return distA - distB;
      });
    }

    return list;
  },

  /**
   * The landlord's own listings, resolved directly from Supabase.
   *
   * `properties` SELECT is public (RLS `properties_select` uses `true`), so we
   * fetch the full table and filter with the canonical ownership matcher. This
   * returns byte-for-byte what the database actually holds for this landlord,
   * making it the single source of truth for the My Listings view.
   */
  async getMyListings() {
    const identity = await getAuthIdentity();
    if (!identity) return [];

    const { data, error } = await supabase
      .from('properties')
      .select('*');

    if (error) {
      console.error('[Supabase getMyListings error]:', error.message);
      return [];
    }

    const owned = (data || []).map(sanitizeRow).filter(p => landlordOwnsProperty(p, identity));
    const rated = await this._attachStudentRatings(owned);
    return this._attachLandlordVerifications(rated);
  },

  async getPropertyById(id) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[Supabase getPropertyById error]:', error.message);
      throw new ApiError(`Property not found: ${error.message}`, 404);
    }

    if (!data) return null;
    const rated = await this._attachStudentRatings([sanitizeRow(data)]);
    const [enriched] = await this._attachLandlordVerifications(rated);
    return enriched || null;
  },

  // ── Student ratings for a boarding house ──────────────────────────────────

  /**
   * True only when the signed-in student actually boarded this property.
   * Pending and rejected applications do not qualify.
   */
  async _hasBoardedProperty(propertyId, candidateIds = []) {
    if (!propertyId || !Array.isArray(candidateIds) || candidateIds.length === 0) return false;

    try {
      const { data, error } = await supabase
        .from('tenancy')
        .select('*')
        .eq('propertyId', propertyId)
        .in('userId', candidateIds);

      if (error || !Array.isArray(data)) return false;

      return data.some(row =>
        Number(row.isActive) === 1 ||
        String(row.status || '').toLowerCase() === 'ended'
      );
    } catch {
      return false;
    }
  },

  /**
   * Public ratings for one boarding house plus the caller's write permission.
   *
   * Everyone (including signed-out visitors) gets the reviews and the average.
   * `canRate` is true only for a student with an active or ended tenancy on
   * this property; `myReview` is their existing rating, if any.
   */
  async getPropertyReviews(propertyId) {
    if (!propertyId) throw new ApiError('A boarding house is required.', 400);

    let reviews = [];
    try {
      const { data, error } = await supabase
        .from('property_reviews')
        .select('*')
        .eq('propertyId', propertyId)
        .order('createdAt', { ascending: false });

      if (!error && Array.isArray(data)) reviews = data.map(sanitizeRow);
    } catch {
      reviews = [];
    }

    const reviewCount = reviews.length;
    const rating = reviewCount
      ? Number((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount).toFixed(1))
      : 0;

    let authUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data?.user || null;
    } catch {
      authUser = null;
    }

    let canRate = false;
    let myReview = null;

    if (authUser) {
      const candidateIds = await getUserCandidateIds(authUser);
      myReview = reviews.find(r => candidateIds.includes(String(r.userId))) || null;
      canRate = await this._hasBoardedProperty(propertyId, candidateIds);
    }

    return {
      success: true,
      data: { reviews, rating, reviewCount, canRate, myReview }
    };
  },

  /**
   * Create or update the signed-in student's rating for a boarding house.
   * The database enforces the same eligibility rule, so this cannot be
   * bypassed with a direct API call.
   */
  async submitPropertyReview({ propertyId, rating, comment = '' } = {}) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Sign in to rate this boarding house.', 401);
    if (!propertyId) throw new ApiError('A boarding house is required.', 400);

    const value = Number(rating);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      throw new ApiError('Choose a rating from 1 to 5 stars.', 400);
    }

    const candidateIds = await getUserCandidateIds(authUser);
    const canRate = await this._hasBoardedProperty(propertyId, candidateIds);
    if (!canRate) {
      throw new ApiError('Only students who have boarded this boarding house can rate it.', 403);
    }

    let profile = null;
    try {
      const { data } = await supabase
        .from('users')
        .select('name, course')
        .eq('id', authUser.id)
        .maybeSingle();
      profile = data;
    } catch {
      profile = null;
    }

    const payload = {
      // Deterministic id keeps one rating per student per property.
      id: `review-${authUser.id}-${propertyId}`.slice(0, 180),
      propertyId,
      userId: authUser.id,
      studentName: profile?.name || authUser.user_metadata?.name || 'Verified boarder',
      course: profile?.course || '',
      rating: Math.round(value),
      comment: String(comment || '').trim().slice(0, 1200),
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('property_reviews')
      .upsert([payload], { onConflict: 'propertyId,userId' })
      .select()
      .maybeSingle();

    if (error) {
      const blocked = /row-level security|permission denied|violates/i.test(error.message || '');
      throw new ApiError(
        blocked
          ? 'Only students who have boarded this boarding house can rate it.'
          : `Could not save your rating: ${error.message}`,
        500
      );
    }

    const refreshed = await this.getPropertyReviews(propertyId);
    return {
      success: true,
      message: 'Your rating was saved.',
      data: {
        review: data ? sanitizeRow(data) : null,
        ...refreshed.data
      }
    };
  },

  async updateAvailability(id, availableCount, statusTag, statusColor) {
    const { data, error } = await supabase
      .from('properties')
      .update({
        availableCount: Number(availableCount),
        statusTag,
        statusColor,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Supabase updateAvailability error]:', error.message);
      throw new ApiError(error.message, 500);
    }

    // Postgres reports success even when RLS filtered every row out, so a null
    // result means nothing was written. Throw instead of returning a phantom
    // row — otherwise the UI shows a count that disappears on the next reload.
    if (!data) {
      throw new ApiError('Vacancy was not updated. You can only change your own listings.', 403);
    }

    return sanitizeRow(data);
  },

  async createProperty(propData) {
    const id = propData.id || `pad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const availableCount = Number(propData.availableCount ?? 1);
    const price = Number(propData.price ?? 3500);

    // Stamp ownership from the authenticated user so the listing is always
    // linked to the real landlord (the same key the RLS `properties_insert`
    // policy checks). Without this, a listing could be written with
    // landlord.userId = null and silently orphaned from the landlord's hub.
    const identity = await getAuthIdentity();
    const landlord = {
      ...(propData.landlord || {}),
      name: propData.landlord?.name || identity?.name || 'Host',
      email: propData.landlord?.email || identity?.email || '',
      userId: propData.landlord?.userId || identity?.id || null
    };

    const record = {
      id,
      name: propData.name?.trim() || 'Untitled Pad',
      campusId: propData.campusId || 'fsuu-main',
      zone: propData.zone?.trim() || 'Unspecified',
      area: propData.area?.trim() || '',
      shortLocation: propData.shortLocation || propData.zone?.trim() || '',
      roomType: propData.roomType || '',
      gender: propData.gender || '',
      availableCount,
      statusTag: propData.statusTag || (availableCount === 0 ? 'Fully Occupied' : `${availableCount} Room${availableCount === 1 ? '' : 's'} Available`),
      statusColor: propData.statusColor || (availableCount === 0 ? 'orange' : 'green'),
      price,
      priceSubtext: propData.priceSubtext || '/month',
      advanceDeposit: propData.advanceDeposit || '',
      minContract: propData.minContract || '',
      rating: 0,
      reviewCount: 0,
      landlord,
      images: Array.isArray(propData.images) ? propData.images : [],
      gateProximities: propData.gateProximities || {},
      trikeFare: propData.trikeFare || '',
      badges: propData.badges || {},
      mapCoordinates: propData.mapCoordinates || { x: 50, y: 50 },
      latitude: toCoordinate(propData.latitude),
      longitude: toCoordinate(propData.longitude),
      floodRating: propData.floodRating || {},
      waterSystem: propData.waterSystem || {},
      powerSystem: propData.powerSystem || {},
      buildingCondition: propData.buildingCondition || {},
      wifiAudit: propData.wifiAudit || {},
      commuteSteps: Array.isArray(propData.commuteSteps) ? propData.commuteSteps : [],
      amenities: Array.isArray(propData.amenities) ? propData.amenities : [],
      rules: Array.isArray(propData.rules) ? propData.rules : [],
      vibeChecks: propData.vibeChecks || {},
      povRoute: propData.povRoute || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let { data, error } = await supabase
      .from('properties')
      .insert([record])
      .select()
      .maybeSingle();

    // Backward compatibility: latitude/longitude arrive with the
    // supabase/add-map-coordinates.sql migration. If it has not been run yet,
    // still publish the listing instead of failing the whole form.
    if (error && /latitude|longitude/i.test(error.message || '')) {
      const { latitude: _lat, longitude: _lng, ...withoutCoordinates } = record;
      ({ data, error } = await supabase
        .from('properties')
        .insert([withoutCoordinates])
        .select()
        .maybeSingle());
    }

    if (error) {
      console.error('[Supabase createProperty error]:', error.message);
      throw new ApiError(`Failed to publish pad: ${error.message}`, 500);
    }

    const created = sanitizeRow(data || record);

    // Creating a listing creates its dedicated pad group (the database trigger
    // does this too). Asking again here keeps the landlord's inbox correct
    // immediately, and repairs listings created before pad groups existed.
    await this._refreshPadGroup(created?.id || id);

    return created;
  },

  async updateProperty(id, propData) {
    const availableCount = propData.availableCount !== undefined ? Number(propData.availableCount) : undefined;
    const price = propData.price !== undefined ? Number(propData.price) : undefined;

    const payload = {
      ...propData,
      updatedAt: new Date().toISOString()
    };

    // Re-stamp the durable ownership keys from the authenticated user, but
    // never erase an existing name/phone/etc. This keeps editing safe even if
    // the client omitted landlord.userId/email (which would otherwise break the
    // RLS `properties_update` policy and detach the listing from My Listings).
    const identity = await getAuthIdentity();
    if (payload.landlord && identity) {
      payload.landlord = {
        ...payload.landlord,
        userId: payload.landlord.userId || identity.id || null,
        email: payload.landlord.email || identity.email || ''
      };
    }

    if (availableCount !== undefined) {
      payload.availableCount = availableCount;
      if (!payload.statusTag) {
        payload.statusTag = availableCount === 0 ? 'Fully Occupied' : `${availableCount} Room${availableCount === 1 ? '' : 's'} Available`;
        payload.statusColor = availableCount === 0 ? 'orange' : 'green';
      }
    }
    if (price !== undefined) {
      payload.price = price;
    }

    if (payload.latitude !== undefined) payload.latitude = toCoordinate(payload.latitude);
    if (payload.longitude !== undefined) payload.longitude = toCoordinate(payload.longitude);

    // Do not overwrite ID
    delete payload.id;

    // Filter to known valid database columns to protect against PostgREST schema errors
    const VALID_PROPERTY_COLUMNS = [
      'name', 'campusId', 'zone', 'area', 'shortLocation', 'roomType',
      'gender', 'statusTag', 'statusColor', 'availableCount', 'price',
      'priceSubtext', 'advanceDeposit', 'minContract',
      'landlord', 'images', 'gateProximities', 'trikeFare', 'badges',
      'mapCoordinates', 'latitude', 'longitude', 'buildingCondition', 'floodRating', 'waterSystem', 'powerSystem',
      'wifiAudit', 'commuteSteps', 'amenities', 'rules', 'vibeChecks',
      'povRoute', 'updatedAt'
    ];

    const safePayload = {};
    for (const key of VALID_PROPERTY_COLUMNS) {
      if (payload[key] !== undefined) {
        safePayload[key] = payload[key];
      }
    }

    let { data, error } = await supabase
      .from('properties')
      .update(safePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

    // Same backward compatibility as createProperty: if the coordinate columns
    // are missing, save everything else and leave the map position untouched.
    if (error && /latitude|longitude/i.test(error.message || '')) {
      const fallbackPayload = { ...safePayload };
      delete fallbackPayload.latitude;
      delete fallbackPayload.longitude;
      ({ data, error } = await supabase
        .from('properties')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .maybeSingle());
    }

    if (error) {
      console.error('[Supabase updateProperty error]:', error.message);
      throw new ApiError(`Failed to update pad: ${error.message}`, 500);
    }

    return sanitizeRow(data);
  },

  async deleteProperty(id) {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Supabase deleteProperty error]:', error.message);
      throw new ApiError(`Failed to delete pad: ${error.message}`, 500);
    }

    return { success: true };
  },

  async verifyPropertyAudit(id, auditData = {}) {
    // Only the `badges` column is read and written here. Selecting the
    // landlord-claim columns (buildingCondition, floodRating, …) previously
    // hard-crashed when those columns didn't exist yet in the DB.
    const { data: currentProp, error: fetchErr } = await supabase
      .from('properties')
      .select('badges')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !currentProp) {
      throw new ApiError(`Property not found: ${fetchErr?.message || 'Invalid ID'}`, 404);
    }

    const currentBadges = typeof currentProp.badges === 'string'
      ? JSON.parse(currentProp.badges)
      : (currentProp.badges || {});

    const isVerified = auditData.isUriosVerified !== undefined ? Boolean(auditData.isUriosVerified) : true;

    const updatedBadges = {
      ...currentBadges,
      isUriosVerified: isVerified,
      verifiedBadge: isVerified ? 'Urios Student Verified' : 'Pending Urios Audit',
      inspectionDate: auditData.inspectionDate || 'October 2026',
      auditorName: auditData.auditorName || 'FSUU Housing Committee Admin',
      auditNotes: auditData.auditNotes !== undefined ? auditData.auditNotes : (currentBadges.auditNotes || ''),
      // Never fabricate per-item verdicts: an audit call that does not say which
      // items were checked certifies none of them, rather than all of them.
      verifiedItems: auditData.verifiedItems || currentBadges.verifiedItems || {
        goodCondition: false,
        flood: false,
        water: false,
        power: false,
        mobile: false,
        wifi: false
      }
    };

    const payload = {
      badges: updatedBadges,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Supabase verifyPropertyAudit error]:', error.message);
      throw new ApiError(`Failed to save audit verification: ${error.message}`, 500);
    }

    return sanitizeRow(data);
  },

  // ── Campuses & Zones ──────────────────────────────────────────────────────

  async getCampuses() {
    const { data, error } = await supabase
      .from('campuses')
      .select('*');

    if (error) {
      console.error('[Supabase getCampuses error]:', error.message);
      return [];
    }

    return (data || []).map(sanitizeRow);
  },

  async getZones() {
    const campuses = await this.getCampuses();
    if (campuses.length > 0 && Array.isArray(campuses[0].zones)) {
      return ['All Zones', ...campuses[0].zones];
    }

    const { data } = await supabase.from('properties').select('zone');
    const unique = Array.from(new Set((data || []).map(p => p.zone).filter(Boolean)));
    return ['All Zones', ...unique];
  },

  // ── Appliances & Cost Calculator ──────────────────────────────────────────

  async getAppliances() {
    const { data, error } = await supabase
      .from('appliances')
      .select('*');

    if (error) {
      console.error('[Supabase getAppliances error]:', error.message);
      return [];
    }

    return data || [];
  },

  async calculateCost({ propertyId: _propertyId, baseRent, selectedAppliances = [], acHoursPerDay = 0, kwhRate = 14 }) {
    const appliancesCatalog = await this.getAppliances();
    const itemMap = new Map(appliancesCatalog.map(a => [a.id, a]));

    const appliancesTotal = selectedAppliances.reduce((sum, id) => {
      const item = itemMap.get(id);
      return sum + (item ? item.monthlyCost : 0);
    }, 0);

    const hours = Math.max(0, Number(acHoursPerDay) || 0);
    const rate = Number(kwhRate) || 14;
    const estimatedAcKwh = Math.round(hours * 0.75 * 30 * 10) / 10;
    const estimatedAcCost = Math.round(estimatedAcKwh * rate);

    const rent = Number(baseRent) || 0;
    const totalMonthlyCost = rent + appliancesTotal + estimatedAcCost;

    return {
      baseRent: rent,
      appliancesTotal,
      airconEstimate: {
        hoursPerDay: hours,
        kwhRate: rate,
        estimatedMonthlyKwh: estimatedAcKwh,
        estimatedMonthlyCost: estimatedAcCost
      },
      totalMonthlyCost
    };
  },

  // ── Ocular Visits ─────────────────────────────────────────────────────────

  async scheduleVisit(visitData) {
    const visitId = `visit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = {
      id: visitId,
      propertyId: visitData.propertyId,
      studentName: visitData.studentName,
      studentId: visitData.studentId || 'N/A',
      course: visitData.course || 'General Student',
      phone: visitData.phone || '',
      date: visitData.date,
      timeSlot: visitData.timeSlot,
      notes: visitData.notes || '',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('ocular_visits').insert([record]);
    if (error) {
      console.error('[Supabase scheduleVisit error]:', error.message);
      throw new ApiError(error.message, 500);
    }

    return {
      success: true,
      message: 'Ocular visit successfully scheduled and confirmed',
      data: record
    };
  },

  // ── Tenancy, Tenants Directory & Curfew ────────────────────────────────────

  async getTenantsByProperty(propertyId) {
    if (!propertyId) return { success: true, count: 0, data: [] };

    try {
      const { data: tenancies, error } = await supabase
        .from('tenancy')
        .select('*')
        .eq('propertyId', propertyId)
        .eq('isActive', 1);

      if (!error && Array.isArray(tenancies) && tenancies.length > 0) {
        const userIds = tenancies.map(t => t.userId).filter(Boolean);
        let usersMap = {};

        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .in('id', userIds);
          if (usersData) {
            usersData.forEach(u => { usersMap[u.id] = u; });
          }
        }

        const enriched = tenancies.map(t => ({
          ...t,
          student: usersMap[t.userId] || {
            id: t.userId,
            name: 'Active Boarder',
            course: 'FSUU Student',
            yearLevel: 'Student',
            avatarInitials: 'ST'
          }
        }));

        return { success: true, count: enriched.length, data: enriched };
      }
    } catch (err) {
      console.warn('[Supabase getTenantsByProperty error]:', err.message);
    }

    return { success: true, count: 0, data: [] };
  },

  /**
   * Pending tenant applications for the signed-in landlord's pads.
   * A student "boards/applies" -> status 'pending' (isActive = 0). The
   * landlord must approve before the student becomes an active tenant.
   */
  async getLandlordTenantApplications(propertyIds = []) {
    const identity = await getAuthIdentity();
    if (!identity) return { success: true, count: 0, data: [] };

    let propIds = Array.isArray(propertyIds) ? propertyIds.filter(Boolean) : [];
    if (propIds.length === 0) {
      try {
        const listings = await this.getMyListings();
        propIds = listings.map(p => p.id);
      } catch {
        propIds = [];
      }
    }
    if (propIds.length === 0) return { success: true, count: 0, data: [] };

    const { data: rows, error } = await supabase
      .from('tenancy')
      .select('*')
      .in('propertyId', propIds)
      .eq('isActive', 0)
      .order('id', { ascending: false });

    if (error) {
      console.warn('[Supabase getLandlordTenantApplications error]:', error.message);
      return { success: true, count: 0, data: [] };
    }

    // Only pending requests — rows without a status column are treated as
    // pending so nothing is lost before the migration is applied.
    const pending = (rows || []).filter(t => (t.status ?? 'pending') === 'pending');

    const userIds = Array.from(new Set(pending.map(t => t.userId).filter(Boolean)));
    let usersMap = {};
    if (userIds.length > 0) {
      try {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds);
        (usersData || []).forEach(u => { usersMap[u.id] = u; });
      } catch {
        // ignore enrichment failures
      }
    }

    const enriched = pending.map(t => ({
      ...t,
      student: usersMap[t.userId] || {
        id: t.userId,
        name: t.studentName || 'Student Applicant',
        course: t.course || 'FSUU Student',
        avatarInitials: (t.studentName || 'ST').substring(0, 2).toUpperCase()
      }
    }));

    return { success: true, count: enriched.length, data: enriched };
  },

  async getMyRoom(_token) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: true, data: null };
    }

    const candidateIds = await getUserCandidateIds(authUser);

    const { data: tenancyRows, error } = await supabase
      .from('tenancy')
      .select('*')
      .in('userId', candidateIds)
      .eq('isActive', 1)
      .order('id', { ascending: false });

    if (error) {
      console.error('[Supabase getMyRoom error]:', error.message);
      return { success: true, data: null };
    }

    const tenancyRow = tenancyRows?.[0];
    if (!tenancyRow) {
      return { success: true, data: null };
    }

    const prop = await this.getPropertyById(tenancyRow.propertyId);
    return {
      success: true,
      data: {
        tenancy: tenancyRow,
        property: prop
      }
    };
  },

  /**
   * The student's most recent board application that is not (yet) an active
   * tenancy — i.e. a pending request or a declined one.
   */
  async getMyTenancyApplication() {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return { success: true, data: null };

    const candidateIds = await getUserCandidateIds(authUser);

    const { data: rows, error } = await supabase
      .from('tenancy')
      .select('*')
      .in('userId', candidateIds)
      .eq('isActive', 0)
      .order('id', { ascending: false });

    if (error || !Array.isArray(rows)) {
      return { success: true, data: null };
    }

    const application = rows.find(t => {
      const status = t.status ?? 'pending';
      return status === 'pending' || status === 'rejected';
    }) || null;

    return { success: true, data: application };
  },

  async leaveTenancy(tenancyId, leaveDetails = {}) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Authentication required.', 401);

    const candidateIds = await getUserCandidateIds(authUser);

    // 1. Mark tenancy as inactive and record it as ended
    const buildDeactivate = (includeStatus) => {
      let q = supabase
        .from('tenancy')
        .update(includeStatus ? { isActive: 0, status: 'ended' } : { isActive: 0 });
      if (tenancyId) q = q.eq('id', tenancyId);
      else q = q.in('userId', candidateIds);
      return q;
    };

    let { error } = await buildDeactivate(true);
    if (error && isMissingColumnError(error)) {
      ({ error } = await buildDeactivate(false));
    }
    if (error) {
      console.error('[Supabase leaveTenancy error]:', error.message);
      throw new ApiError(`Failed to conclude tenancy: ${error.message}`, 500);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('balay_active_tenancy_prop_id');
        localStorage.setItem('balay_tenancy_left', 'true');
      } catch {}
    }

    // 2. Increment room availableCount if propertyId is provided
    if (leaveDetails.propertyId) {
      try {
        const { data: propData } = await supabase
          .from('properties')
          .select('availableCount')
          .eq('id', leaveDetails.propertyId)
          .single();

        if (propData && typeof propData.availableCount === 'number') {
          const nextCount = propData.availableCount + 1;
          await supabase
            .from('properties')
            .update({
              availableCount: nextCount,
              statusTag: `${nextCount} Room${nextCount > 1 ? 's' : ''} Available`,
              statusColor: 'green'
            })
            .eq('id', leaveDetails.propertyId);
        }
      } catch (err) {
        console.warn('Non-fatal: could not update property availableCount on vacate:', err.message);
      }
    }

    return {
      success: true,
      message: 'Notice of departure received. Tenancy concluded successfully.'
    };
  },


  /**
   * Student applies to board a pad. This does NOT create an active tenancy —
   * it creates a PENDING application (isActive = 0) that the landlord must
   * approve. No vacancy is consumed and no escrow receipt is issued yet.
   */
  async boardProperty(boardingData) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Authentication required.', 401);

    const candidateIds = await getUserCandidateIds(authUser);
    const userId = authUser.id;

    const {
      propertyId,
      propertyName,
      roomNumber = 'Room 201',
      submeterNumber = 'SM-201',
      semester = '1st Sem 2026-2027'
    } = boardingData;

    if (!propertyId || !propertyName) {
      throw new ApiError('A valid property is required to submit a boarding application.', 400);
    }

    // Guard against duplicate open applications for the same pad.
    try {
      const { data: existing } = await supabase
        .from('tenancy')
        .select('id, status, isActive')
        .in('userId', candidateIds)
        .eq('propertyId', propertyId)
        .eq('isActive', 0);
      if ((existing || []).some(t => (t.status ?? '') === 'pending')) {
        throw new ApiError('You already have a pending application for this boarding house. Please wait for the landlord to review it.', 409);
      }
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // ignore lookup failures — the application can still proceed
    }

    // Switching pads: conclude any currently active tenancy for this student.
    const buildDeactivate = (includeStatus) => {
      let q = supabase
        .from('tenancy')
        .update(includeStatus ? { isActive: 0, status: 'ended' } : { isActive: 0 })
        .in('userId', candidateIds)
        .eq('isActive', 1);
      return q;
    };
    let { error: deactivateError } = await buildDeactivate(true);
    if (deactivateError && isMissingColumnError(deactivateError)) {
      ({ error: deactivateError } = await buildDeactivate(false));
    }

    // Calculate next rent due (1 month from now)
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    const nextRentDue = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const tenancyId = `tenant-${Date.now()}`;
    const application = {
      id: tenancyId,
      userId,
      propertyId,
      propertyName,
      roomNumber,
      submeterNumber,
      submeterKwh: 0,
      submeterCost: 0,
      nextRentDue,
      semester,
      isActive: 0,
      status: 'pending'
    };

    const insertRes = await insertTenancyRow(application);
    if (insertRes.error) {
      console.error('[Supabase boardProperty error]:', insertRes.error.message);
      throw new ApiError(`Failed to submit boarding application: ${insertRes.error.message}`, 500);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('balay_active_tenancy_prop_id');
        localStorage.removeItem('balay_tenancy_left');
      } catch {}
    }

    return {
      success: true,
      message: `Boarding application submitted for ${propertyName}. Awaiting landlord approval.`,
      data: {
        tenancy: insertRes.data || application,
        awaitingApproval: true,
        receipt: null
      }
    };
  },

  /**
   * Landlord approves a pending application -> the student becomes an active
   * tenant. Activates the tenancy, consumes one vacancy, and issues the
   * move-in escrow receipt.
   */
  async approveTenantApplication(tenancyId) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Authentication required.', 401);
    if (!tenancyId) throw new ApiError('A valid application is required.', 400);

    const { data: row, error: fetchError } = await supabase
      .from('tenancy')
      .select('*')
      .eq('id', tenancyId)
      .maybeSingle();

    if (fetchError || !row) {
      throw new ApiError(`Application not found: ${fetchError?.message || 'Invalid ID'}`, 404);
    }

    const updateRes = await updateTenancyRow(tenancyId, { isActive: 1, status: 'active' });
    if (updateRes.error) {
      console.error('[Supabase approveTenantApplication error]:', updateRes.error.message);
      throw new ApiError(`Failed to approve application: ${updateRes.error.message}`, 500);
    }

    // Consume one vacancy on the pad (non-fatal if it fails).
    try {
      const { data: propData } = await supabase
        .from('properties')
        .select('availableCount')
        .eq('id', row.propertyId)
        .maybeSingle();
      if (propData && Number(propData.availableCount) > 0) {
        const newCount = Number(propData.availableCount) - 1;
        const newTag = newCount === 0 ? 'Fully Occupied' : `${newCount} Room${newCount === 1 ? '' : 's'} Available`;
        await supabase.from('properties').update({
          availableCount: newCount,
          statusTag: newTag,
          statusColor: newCount === 0 ? 'orange' : 'green',
          updatedAt: new Date().toISOString()
        }).eq('id', row.propertyId);
      }
    } catch (err) {
      console.warn('[approveTenantApplication - non-fatal vacancy update error]:', err.message);
    }

    // Issue the official move-in escrow receipt (non-fatal).
    let receiptRecord = null;
    try {
      const { data: propRow } = await supabase
        .from('properties')
        .select('price')
        .eq('id', row.propertyId)
        .maybeSingle();
      const monthly = Number(propRow?.price) || 0;
      receiptRecord = {
        id: `rec-board-${Date.now()}`,
        userId: row.userId,
        propertyId: row.propertyId,
        title: `Move-in Advance & Security Deposit (${row.propertyName || row.propertyId})`,
        amount: monthly * 2,
        paymentDate: new Date().toISOString().split('T')[0],
        refNumber: `BU-ESCROW-${Math.floor(100000 + Math.random() * 900000)}`,
        type: 'Advance Deposit & Move-In',
        status: 'Verified Official Escrow'
      };
      await supabase.from('receipts').insert([receiptRecord]);
    } catch (err) {
      console.warn('[approveTenantApplication - non-fatal receipt error]:', err.message);
    }

    // The approved boarder joins their pad's group chat automatically (the
    // tenancy trigger does this too; this keeps the landlord's inbox current).
    await this._refreshPadGroup(row.propertyId);

    return {
      success: true,
      message: 'Application approved. The student is now an active tenant.',
      data: updateRes.data || { ...row, isActive: 1, status: 'active' },
      receipt: receiptRecord
    };
  },

  /**
   * Landlord declines a pending application. No vacancy is consumed and the
   * student never becomes a tenant.
   */
  async rejectTenantApplication(tenancyId, note = '') {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Authentication required.', 401);
    if (!tenancyId) throw new ApiError('A valid application is required.', 400);

    const updateRes = await updateTenancyRow(tenancyId, { isActive: 0, status: 'rejected' });
    if (updateRes.error) {
      console.error('[Supabase rejectTenantApplication error]:', updateRes.error.message);
      throw new ApiError(`Failed to decline application: ${updateRes.error.message}`, 500);
    }

    return {
      success: true,
      message: 'Application declined. The student was not added as a tenant.',
      data: updateRes.data || { id: tenancyId, isActive: 0, status: 'rejected', landlordNote: note }
    };
  },

  async submitCurfewSlip(slipData, _token) {
    let authUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data?.user || null;
    } catch {
      // ignore
    }

    if (!authUser) {
      throw new ApiError('Authentication required to submit a curfew slip.', 401);
    }

    let profile = null;
    if (authUser.email) {
      try {
        const { data } = await supabase
          .from('users').select('id, name, course, studentId, propertyId').eq('email', authUser.email).maybeSingle();
        profile = data;
      } catch {
        // ignore
      }
    }

    const propertyId = slipData.propertyId || profile?.propertyId || authUser.user_metadata?.propertyId;
    if (!propertyId) {
      throw new ApiError('A room assignment is required before submitting a curfew slip.', 400);
    }

    const userId = authUser.id;
    const slipId = `slip-${Date.now()}`;
    const passCode = `PASS-FSUU-${Math.floor(100000 + Math.random() * 900000)}`;

    const newSlip = {
      id: slipId,
      userId,
      propertyId,
      studentName: slipData.studentName || profile?.name || authUser.user_metadata?.name || authUser.email.split('@')[0],
      studentId: slipData.studentId || profile?.studentId || authUser.user_metadata?.studentId || '',
      course: slipData.course || profile?.course || authUser.user_metadata?.course || '',
      reason: slipData.reason || 'Curfew exemption request',
      dutyLocation: slipData.dutyLocation || '',
      date: slipData.date || new Date().toISOString().split('T')[0],
      expectedReturn: slipData.expectedReturn || '06:00 AM',
      status: slipData.status || 'pending',
      digitalPassCode: passCode,
      landlordNote: slipData.landlordNote || null,
      approvedAt: slipData.status === 'approved' ? new Date().toISOString() : null,
      approvedBy: slipData.status === 'approved' ? (slipData.approvedBy || null) : null,
      createdAt: new Date().toISOString()
    };

    // Attempt insert into Supabase
    try {
      let { error } = await supabase.from('curfew_slips').insert([newSlip]);
      // If table lacks new columns, retry with basic fields
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const basicSlip = {
          id: newSlip.id,
          userId: newSlip.userId,
          propertyId: newSlip.propertyId,
          studentName: newSlip.studentName,
          studentId: newSlip.studentId,
          course: newSlip.course,
          reason: newSlip.reason,
          dutyLocation: newSlip.dutyLocation,
          date: newSlip.date,
          expectedReturn: newSlip.expectedReturn,
          status: newSlip.status,
          digitalPassCode: newSlip.digitalPassCode,
          createdAt: newSlip.createdAt
        };
        const retry = await supabase.from('curfew_slips').insert([basicSlip]);
        error = retry.error;
      }
      if (error) {
        console.warn('[Supabase submitCurfewSlip warning]:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase submitCurfewSlip exception]:', err.message);
    }

    return {
      success: true,
      message: 'Curfew exemption notice submitted. Pending landlord approval.',
      data: newSlip
    };
  },

  async getReceipts(_token) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: true, count: 0, data: [] };
    }

    const candidateIds = await getUserCandidateIds(authUser);

    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .in('userId', candidateIds)
      .order('id', { ascending: false });

    if (error) {
      console.error('[Supabase getReceipts error]:', error.message);
      return { success: true, count: 0, data: [] };
    }

    return { success: true, count: (data || []).length, data: data || [] };
  },

  async getCurfewSlips(options = {}, _token) {
    let authUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data?.user || null;
    } catch {
      // ignore
    }

    const opts = typeof options === 'string' ? {} : (options || {});

    try {
      let query = supabase.from('curfew_slips').select('*');

      if (opts.propertyId) {
        query = query.eq('propertyId', opts.propertyId);
      } else if (Array.isArray(opts.propertyIds) && opts.propertyIds.length > 0) {
        query = query.in('propertyId', opts.propertyIds);
      } else if (opts.userId) {
        query = query.eq('userId', opts.userId);
      } else if (authUser) {
        const candidateIds = await getUserCandidateIds(authUser);
        const isLandlord = authUser.user_metadata?.role === 'landlord';
        if (isLandlord && authUser.user_metadata?.propertyId) {
          query = query.eq('propertyId', authUser.user_metadata.propertyId);
        } else {
          query = query.in('userId', candidateIds);
        }
      }

      const { data, error } = await query.order('createdAt', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        return { success: true, count: data.length, data };
      }
      if (error) {
        console.warn('[Supabase getCurfewSlips warning]:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase getCurfewSlips exception]:', err.message);
    }

    return { success: true, count: 0, data: [] };
  },

  async getCurfewSlipsByProperty(propertyId) {
    if (!propertyId) return { success: true, count: 0, data: [] };

    try {
      const { data, error } = await supabase
        .from('curfew_slips')
        .select('*')
        .eq('propertyId', propertyId)
        .order('createdAt', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return { success: true, count: data.length, data };
      }
      if (error) {
        console.warn('[Supabase getCurfewSlipsByProperty warning]:', error.message);
      }
    } catch (err) {
      console.warn('[Supabase getCurfewSlipsByProperty exception]:', err.message);
    }

    return { success: true, count: 0, data: [] };
  },

  async updateCurfewSlipStatus(slipId, status, options = {}) {
    let authUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data?.user || null;
    } catch {
      // ignore
    }

    const approvedBy = options.approvedBy || authUser?.user_metadata?.name || 'Landlord Host';
    const landlordNote = options.landlordNote || '';
    const now = new Date().toISOString();

    const fullPayload = {
      status,
      landlordNote,
      approvedAt: status === 'approved' ? now : null,
      approvedBy: status === 'approved' ? approvedBy : null
    };

    try {
      let { data, error } = await supabase
        .from('curfew_slips')
        .update(fullPayload)
        .eq('id', slipId)
        .select();

      // If columns don't exist yet on remote table, fallback to basic status update
      if (error && (error.message?.includes('column') || error.code === '42703')) {
        const basicPayload = { status };
        const fallbackRes = await supabase
          .from('curfew_slips')
          .update(basicPayload)
          .eq('id', slipId)
          .select();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('[Supabase updateCurfewSlipStatus warning]:', error.message);
      } else if (data && data.length > 0) {
        return {
          success: true,
          message: `Curfew pass has been ${status === 'approved' ? 'approved' : status === 'rejected' ? 'declined' : 'updated'}.`,
          data: data[0]
        };
      }
    } catch (err) {
      console.warn('[Supabase updateCurfewSlipStatus exception]:', err.message);
    }

    return {
      success: true,
      message: `Curfew pass has been ${status === 'approved' ? 'approved' : status === 'rejected' ? 'declined' : 'updated'}.`,
      data: { id: slipId, status, ...fullPayload }
    };
  },

  // ── In-App Messaging (direct + landlord-managed group chats) ─────────────

  /** Every other account, for starting a chat or adding group members. */
  async getMessageContacts() {
    const identity = await getAuthIdentity();
    if (!identity) return [];

    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, avatarInitials, course, propertyId')
      .order('name', { ascending: true });

    if (error) throw messagingError(error, 'Could not load contacts.');

    return (data || []).filter(row => String(row.id) !== String(identity.id));
  },

  /**
   * Conversations the signed-in user belongs to, with participants, the last
   * message and an unread count derived from each member's lastReadAt marker.
   */
  async getConversations() {
    const identity = await getAuthIdentity();
    if (!identity) return [];

    const { data: myMemberships, error: membershipError } = await supabase
      .from('conversation_members')
      .select('conversationId, role, lastReadAt')
      .eq('userId', identity.id);

    if (membershipError) throw messagingError(membershipError, 'Could not load your chats.');

    const conversationIds = Array.from(new Set(
      (myMemberships || []).map(m => m.conversationId).filter(Boolean)
    ));
    if (conversationIds.length === 0) return [];

    const [conversationRes, memberRes, messageRes] = await Promise.all([
      supabase.from('conversations').select('*').in('id', conversationIds),
      supabase.from('conversation_members').select('*').in('conversationId', conversationIds),
      supabase
        .from('messages')
        .select('*')
        .in('conversationId', conversationIds)
        .order('createdAt', { ascending: false })
        .limit(400)
    ]);

    const failure = conversationRes.error || memberRes.error || messageRes.error;
    if (failure) throw messagingError(failure, 'Could not load your chats.');

    const members = memberRes.data || [];
    const userIds = Array.from(new Set(members.map(m => m.userId).filter(Boolean)));
    let usersById = new Map();

    if (userIds.length > 0) {
      const { data: userRows, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, avatarInitials, course, propertyId')
        .in('id', userIds);

      if (userError) throw messagingError(userError, 'Could not load chat participants.');
      usersById = new Map((userRows || []).map(row => [row.id, row]));
    }

    const membershipByConversation = new Map(
      (myMemberships || []).map(m => [m.conversationId, m])
    );
    const allMessages = messageRes.data || [];

    const conversations = (conversationRes.data || [])
      .map(conv => {
        const conversationMembers = members
          .filter(m => m.conversationId === conv.id)
          .map(m => ({ ...m, user: usersById.get(m.userId) || null }));

        const mine = membershipByConversation.get(conv.id);
        const conversationMessages = allMessages
          .filter(m => m.conversationId === conv.id)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        const lastRead = mine?.lastReadAt ? new Date(mine.lastReadAt).getTime() : 0;
        const unreadCount = conversationMessages.filter(m =>
          m.senderId !== identity.id && new Date(m.createdAt).getTime() > lastRead
        ).length;

        return {
          ...conv,
          members: conversationMembers,
          otherMembers: conversationMembers.filter(m => m.userId !== identity.id),
          lastMessage: conversationMessages[conversationMessages.length - 1] || null,
          unreadCount,
          myRole: mine?.role || 'member',
          isPadGroup: Boolean(conv.propertyId)
        };
      })
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    // Pad groups carry their listing id (conversations.propertyId). Decorate
    // them with the listing so the inbox can label the pad even when the
    // stored conversation title is missing. Purely cosmetic — never fatal.
    const padIds = Array.from(new Set(conversations.map(conv => conv.propertyId).filter(Boolean)));

    if (padIds.length > 0) {
      try {
        const { data: padRows } = await supabase
          .from('properties')
          .select('id, name, zone, area, shortLocation')
          .in('id', padIds);

        const padsById = new Map((padRows || []).map(row => [row.id, row]));

        conversations.forEach(conv => {
          if (!conv.propertyId) return;
          const pad = padsById.get(conv.propertyId) || null;
          conv.pad = pad;
          if (!conv.title && pad?.name) conv.title = `${pad.name} · Pad Group`;
        });
      } catch (err) {
        console.warn('[Supabase pad group labels warning]:', err.message);
      }
    }

    return conversations;
  },

  /** Full message history for one conversation (RLS limits this to members). */
  async getMessages(conversationId) {
    if (!conversationId) return [];

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversationId', conversationId)
      .order('createdAt', { ascending: true })
      .limit(500);

    if (error) throw messagingError(error, 'Could not load messages.');
    return data || [];
  },

  /** Send a message as the signed-in user. */
  async sendMessage(conversationId, body) {
    const identity = await getAuthIdentity();
    if (!identity) throw new ApiError('Sign in to send a message.', 401);

    const text = String(body ?? '').trim();
    if (!conversationId) throw new ApiError('Choose a conversation first.', 400);
    if (!text) throw new ApiError('Message cannot be empty.', 400);
    if (text.length > 4000) throw new ApiError('Message is too long (4,000 characters max).', 400);

    const { data, error } = await supabase
      .from('messages')
      .insert([{
        conversationId,
        senderId: identity.id,
        body: text
      }])
      .select()
      .maybeSingle();

    if (error) throw messagingError(error, 'Could not send your message.');
    return data;
  },

  /** Starts (or reuses) a 1:1 conversation with another account. */
  async startDirectConversation(otherUserId) {
    if (!otherUserId) throw new ApiError('Choose someone to message.', 400);

    const { data, error } = await supabase.rpc('start_direct_conversation', {
      p_user_id: otherUserId
    });

    if (error) throw messagingError(error, 'Could not start that conversation.');
    return data;
  },

  /**
   * The user account behind a listing's `landlord` JSON, or null when that host
   * has not created a Balay Urios account yet.
   *
   * Resolution order mirrors ownership everywhere else in the app:
   *   landlord.userId  -> landlord.email -> landlord.name (landlord accounts)
   * `users` is publicly readable, so a student can resolve the host account
   * before the first message exists.
   */
  async resolveLandlordAccount(landlord = {}) {
    const columns = 'id, name, email, role';

    const wantedId = normalizeId(landlord?.userId);
    if (wantedId) {
      const { data } = await supabase
        .from('users')
        .select(columns)
        .eq('id', String(landlord.userId).trim())
        .limit(1);
      if (data?.[0]) return data[0];
    }

    // Emails are stored lower-cased by sign-up, but legacy rows may not be, so
    // try the value as written and then lower-cased. `eq` (not `ilike`) keeps
    // `_` and `%` in an address from acting as LIKE wildcards.
    const email = String(landlord?.email || '').trim();
    const emailCandidates = Array.from(new Set([email, email.toLowerCase()].filter(Boolean)));

    for (const candidate of emailCandidates) {
      const { data } = await supabase
        .from('users')
        .select(columns)
        .eq('email', candidate)
        .limit(1);
      if (data?.[0]) return data[0];
    }

    const name = String(landlord?.name || '').trim();
    if (name) {
      const { data } = await supabase
        .from('users')
        .select(columns)
        .eq('name', name)
        .eq('role', 'landlord')
        .limit(1);
      if (data?.[0]) return data[0];
    }

    return null;
  },

  /**
   * Opens (or reuses) the direct chat between the signed-in user and the
   * landlord of a listing.
   *
   * Accepts a property row, or just `{ propertyId }` when the caller only knows
   * the pad (e.g. a pending boarding application or a saved listing stub).
   *
   * Returns `{ conversationId, landlord }`. Throws an ApiError the UI can show
   * verbatim when the pad has no landlord or the landlord has no account yet.
   */
  async openLandlordChat(listing = {}) {
    const identity = await getAuthIdentity();
    if (!identity) throw new ApiError('Sign in to message this landlord.', 401);

    let landlord = listing?.landlord || null;
    const propertyId = listing?.propertyId || listing?.property?.id || listing?.id || null;

    if (!landlord && propertyId) {
      const property = await this.getPropertyById(propertyId);
      landlord = property?.landlord || null;
    }

    if (!landlord || (!landlord.name && !landlord.email && !landlord.userId)) {
      throw new ApiError(
        'This pad has not published a landlord yet, so there is nobody to message.',
        404
      );
    }

    if (landlordMatchesAccount(landlord, identity)) {
      throw new ApiError('This is your own listing — you cannot message yourself.', 400);
    }

    const account = await this.resolveLandlordAccount(landlord);
    if (!account) {
      throw new ApiError(
        'This landlord has not activated a Balay Urios account yet, so in-app messages cannot reach them. Call or text the number on their profile instead.',
        404
      );
    }

    if (normalizeId(account.id) === normalizeId(identity.id)) {
      throw new ApiError('This is your own listing — you cannot message yourself.', 400);
    }

    const conversationId = await this.startDirectConversation(account.id);
    if (!conversationId) {
      throw new ApiError('Could not open a conversation with this landlord.', 500);
    }

    return { conversationId, landlord: account };
  },

  /**
   * The profile behind a chat head: the public account row plus the context
   * that makes a conversation meaningful —
   *   * a landlord's listings (public rows),
   *   * a boarder's current pad (only when RLS lets the caller read it).
   *
   * Parent/guardian details and student IDs are deliberately NOT included:
   * a chat profile is visible to whoever is in the thread, not just the host.
   */
  async getChatProfile(userId) {
    if (!userId) throw new ApiError('Choose an account to view.', 400);

    // Only the fields a chat profile renders are projected out of the account
    // row: the table also holds guardian contacts and student IDs, and a chat
    // profile is visible to everyone in the thread.
    const CHAT_PROFILE_FIELDS = [
      'id', 'name', 'email', 'role', 'avatarInitials', 'phone', 'course',
      'yearLevel', 'createdAt', 'isUriosVerified', 'verificationStatus',
      'verifiedAt', 'verifiedBy', 'verificationNotes',
      'facebook', 'instagram', 'twitter'
    ];

    const { data: row, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', String(userId))
      .maybeSingle();

    if (error) throw messagingError(error, 'Could not load that profile.');
    if (!row) throw new ApiError('That account no longer exists.', 404);

    const full = publicUser(row);
    const user = {};
    for (const field of CHAT_PROFILE_FIELDS) {
      if (full[field] !== undefined) user[field] = full[field];
    }

    const profile = { user, listings: [], tenancy: null };

    if (user.role === 'landlord') {
      const { data, error: listingsError } = await supabase
        .from('properties')
        .select('*')
        .order('name', { ascending: true });

      if (listingsError) {
        console.warn('[Supabase chat profile listings warning]:', listingsError.message);
        return profile;
      }

      const identity = { id: user.id, email: user.email };
      const wantedName = String(user.name || '').trim().toLowerCase();

      profile.listings = (await this._attachStudentRatings((data || [])
        .map(sanitizeRow)
        .filter(prop => {
          if (landlordOwnsProperty(prop, identity)) return true;
          // Legacy rows that only carry the host's name in the JSON.
          const ownerName = String(prop.landlord?.name || '').trim().toLowerCase();
          return Boolean(wantedName && ownerName && ownerName === wantedName);
        })))
        .map(prop => ({
          id: prop.id,
          name: prop.name,
          shortLocation: prop.shortLocation || prop.area || '',
          price: Number(prop.price) || 0,
          priceSubtext: prop.priceSubtext || '/month',
          availableCount: Number(prop.availableCount) || 0,
          images: Array.isArray(prop.images) ? prop.images : [],
          rating: Number(prop.rating) || 0,
          reviewCount: Number(prop.reviewCount) || 0,
          statusTag: prop.statusTag || ''
        }));
      return profile;
    }

    if (user.role === 'boarder') {
      // RLS only returns this to the boarder, their own landlord, or an admin.
      // Anyone else simply gets no pad card — never an error.
      try {
        const { data: rows } = await supabase
          .from('tenancy')
          .select('*')
          .eq('userId', user.id)
          .eq('isActive', 1)
          .order('id', { ascending: false })
          .limit(1);

        const tenancy = (rows || [])[0];
        if (tenancy?.propertyId) {
          profile.tenancy = {
            propertyId: tenancy.propertyId,
            propertyName: tenancy.propertyName || null,
            roomNumber: tenancy.roomNumber || null,
            semester: tenancy.semester || null
          };
        }
      } catch {
        // ignore — the pad card is optional context
      }
    }

    return profile;
  },

  /**
   * Creates a group chat. The database only allows landlords (and admins) to
   * create groups, and records the creator as the group's landlord.
   */
  async createGroupConversation(title, memberIds = []) {
    const cleanTitle = String(title || '').trim();
    const ids = Array.from(new Set((memberIds || []).filter(Boolean)));

    if (!cleanTitle) throw new ApiError('Give the group a name.', 400);
    if (ids.length === 0) throw new ApiError('Add at least one member to the group.', 400);

    const { data, error } = await supabase.rpc('create_group_conversation', {
      p_title: cleanTitle,
      p_member_ids: ids
    });

    if (error) throw messagingError(error, 'Could not create the group.');
    return data;
  },

  /** Adds members — the database rejects this unless the caller is the group's landlord. */
  async addGroupMembers(conversationId, userIds = []) {
    const ids = Array.from(new Set((userIds || []).filter(Boolean)));
    if (!conversationId || ids.length === 0) return 0;

    const { data, error } = await supabase.rpc('add_group_members', {
      p_conversation_id: conversationId,
      p_member_ids: ids
    });

    if (error) throw messagingError(error, 'Could not add members.');
    return Number(data) || 0;
  },

  /** Removes a member — the database rejects this unless the caller is the group's landlord. */
  async removeGroupMember(conversationId, userId) {
    if (!conversationId || !userId) return false;

    const { data, error } = await supabase.rpc('remove_group_member', {
      p_conversation_id: conversationId,
      p_user_id: userId
    });

    if (error) throw messagingError(error, 'Could not remove that member.');
    return Boolean(data);
  },

  /** Marks a conversation read up to now for the signed-in user. */
  async markConversationRead(conversationId) {
    if (!conversationId) return;

    const { error } = await supabase.rpc('mark_conversation_read', {
      p_conversation_id: conversationId
    });

    if (error) throw messagingError(error, 'Could not update the read marker.');
  },

  // ── Pad groups (one dedicated group chat per listing) ────────────────────
  //
  // The database owns this: creating a listing creates its pad group, adds the
  // landlord, and adds every approved boarder (see supabase/add-messaging.sql
  // -> pad_group_sync). These helpers only ask the database to reconcile the
  // group, which makes the Messages tab self-healing for older listings.

  /**
   * Opens (and repairs) the pad group for a listing. Allowed for the pad's
   * landlord, its boarders, and admins. Returns the conversation id.
   */
  async ensurePadGroup(propertyId) {
    if (!propertyId) return null;

    const { data, error } = await supabase.rpc('ensure_pad_group', {
      p_property_id: propertyId
    });

    if (error) throw messagingError(error, 'Could not open the pad group.');
    return data || null;
  },

  /**
   * Forces a full membership re-sync of a pad group (landlord only).
   * Use after approving a boarder or transferring a listing.
   */
  async syncPadGroup(propertyId) {
    if (!propertyId) return null;

    const { data, error } = await supabase.rpc('sync_pad_group', {
      p_property_id: propertyId
    });

    if (error) throw messagingError(error, 'Could not sync the pad group.');
    return data || null;
  },

  /** Fire-and-forget pad-group top-up. Never blocks the caller's real work. */
  async _refreshPadGroup(propertyId) {
    if (!propertyId) return null;

    try {
      return await this.ensurePadGroup(propertyId);
    } catch (err) {
      console.warn('[Pad group warning]:', err.message);
      return null;
    }
  },

  // ── Auth (Powered by Supabase Auth) ───────────────────────────────────────

  async register({ name, email, password, role, phone }) {
    if (!name || !email || !password || !role) {
      throw new ApiError('Name, email, password, and role are required.', 400);
    }
    if (password.length < 8) {
      throw new ApiError('Password must be at least 8 characters.', 400);
    }

    const cleanEmail = email.toLowerCase().trim();
    const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

    // Public sign-up only creates real boarder or landlord accounts.
    // Admin access is granted directly in the database (users.role = 'admin').
    if (role === 'admin') {
      throw new ApiError('Admin accounts cannot be self-registered.', 403);
    }
    const dbRole = role === 'landlord' ? 'landlord' : 'boarder';

    // 1. Sign up user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          role: dbRole,
          phone: phone || null,
          avatarInitials: initials,
          propertyId: null
        }
      }
    });

    if (authError) {
      throw new ApiError(authError.message, 400);
    }

    const authUser = authData.user;
    if (!authUser) {
      throw new ApiError('Registration failed. Please check credentials.', 400);
    }

    // 2. Ensure public user profile is stored
    const userRecord = {
      id: authUser.id,
      name: name.trim(),
      email: cleanEmail,
      role: dbRole,
      phone: phone || null,
      avatarInitials: initials,
      propertyId: null,
      createdAt: new Date().toISOString()
    };

    const { data: savedProfile } = await supabase
      .from('users')
      .upsert(userRecord, { onConflict: 'email' })
      .select()
      .maybeSingle();

    const returnedUser = {
      ...(savedProfile || userRecord),
      role: savedProfile?.role || dbRole,
      isAdmin: false
    };

    return {
      success: true,
      message: 'Account registered successfully with Supabase Auth.',
      token: authData.session?.access_token || '',
      user: publicUser(returnedUser)
    };
  },

  async login({ email, password }) {
    if (!email || !password) {
      throw new ApiError('Email and password are required.', 400);
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      throw new ApiError(error.message, 401);
    }

    const authUser = data.user;

    // 2. Load public profile from Supabase users table
    let { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    let profileToUse = profile;
    if (!profileToUse && authUser) {
      const dbRole = authUser.user_metadata?.role === 'landlord' ? 'landlord' : 'boarder';
      const fallbackRecord = {
        id: authUser.id,
        name: authUser.user_metadata?.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: dbRole,
        phone: authUser.user_metadata?.phone || null,
        avatarInitials: authUser.user_metadata?.avatarInitials || cleanEmail.slice(0, 2).toUpperCase(),
        propertyId: authUser.user_metadata?.propertyId || null
      };

      const { data: upserted } = await supabase
        .from('users')
        .upsert(fallbackRecord, { onConflict: 'email' })
        .select()
        .maybeSingle();

      profileToUse = upserted || fallbackRecord;
    }

    const isAdmin = authUser?.user_metadata?.isAdmin === true || profileToUse?.role === 'admin';
    const userRole = isAdmin ? 'admin' : (profileToUse?.role || 'boarder');

    const formattedUser = {
      ...(profileToUse || {}),
      role: userRole,
      isAdmin: Boolean(isAdmin),
      name: profileToUse?.name || cleanEmail.split('@')[0]
    };

    return {
      success: true,
      token: data.session?.access_token || '',
      user: await this._applyOwnValidIdGate(publicUser(formattedUser))
    };
  },

  async getMe(_token) {
    const { data: { user: authUser }, error } = await supabase.auth.getUser();

    if (error || !authUser) {
      return null;
    }

    const isAdmin = authUser.user_metadata?.isAdmin === true;

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .maybeSingle();

    if (profile) {
      const profileIsAdmin = isAdmin || profile.role === 'admin';
      return this._applyOwnValidIdGate(publicUser({
        ...profile,
        role: profileIsAdmin ? 'admin' : profile.role,
        isAdmin: profileIsAdmin,
        name: profile.name
      }));
    }

    return publicUser({
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email,
      role: isAdmin ? 'admin' : (authUser.user_metadata?.role || 'boarder'),
      isAdmin,
      avatarInitials: authUser.user_metadata?.avatarInitials || 'BU',
      propertyId: authUser.user_metadata?.propertyId || null
    });
  },

  /**
   * Saves only the public social handles. Throws a clear error when the
   * supabase/add-social-links.sql migration has not been applied yet.
   */
  async updateSocialLinks(socials = {}) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Authentication required.', 401);

    const payload = {
      facebook: String(socials.facebook || '').trim() || null,
      instagram: String(socials.instagram || '').trim() || null,
      twitter: String(socials.twitter || '').trim() || null
    };

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', authUser.id)
      .select('*')
      .maybeSingle();

    if (error) {
      const hint = isMissingColumnError(error)
        ? ' Run supabase/add-social-links.sql in Supabase first.'
        : '';
      console.error('[Supabase updateSocialLinks error]:', error.message);
      throw new ApiError(`Failed to save social links: ${error.message}.${hint}`, 500);
    }

    // Keep the auth metadata copy in sync as a fallback for getMe().
    try {
      await supabase.auth.updateUser({ data: payload });
    } catch {
      // Non-fatal: the public.users row is the source of truth.
    }

    return publicUser(data || { ...authUser.user_metadata, ...payload });
  },

  async updateProfile(_token, profileData = {}) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Authentication required.', 401);

    // Update metadata in Supabase Auth
    await supabase.auth.updateUser({
      data: profileData
    });

    // Filter to known valid database columns to protect against PostgREST schema errors
    const VALID_USER_COLUMNS = [
      'name', 'phone', 'course', 'yearLevel', 'studentId',
      'parentName', 'parentRelation', 'parentPhone', 'parentCity',
      'avatarInitials', 'propertyId', 'facebook', 'instagram', 'twitter'
    ];

    const safeDbPayload = {};
    for (const key of VALID_USER_COLUMNS) {
      if (profileData[key] !== undefined) {
        safeDbPayload[key] = profileData[key];
      }
    }

    let updatedProfile = null;
    if (Object.keys(safeDbPayload).length > 0) {
      const { data, error } = await supabase
        .from('users')
        .update(safeDbPayload)
        .eq('email', authUser.email)
        .select()
        .maybeSingle();

      if (error) {
        console.warn('[Supabase updateProfile DB warning]:', error.message);
      } else {
        updatedProfile = data;
      }
    }

    const merged = {
      id: authUser.id,
      email: authUser.email,
      ...authUser.user_metadata,
      ...(updatedProfile || {}),
      ...profileData
    };

    return publicUser(merged);
  },

  // ── Saved Properties ──────────────────────────────────────────────────────

  async getSavedProperties(_token, _userId) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      return { success: true, count: 0, savedIds: [], data: [] };
    }

    const candidateIds = await getUserCandidateIds(authUser);

    const { data: savedRows, error } = await supabase
      .from('saved_properties')
      .select('propertyId')
      .in('userId', candidateIds);

    if (error) {
      console.error('[Supabase getSavedProperties error]:', error.message);
      return { success: true, count: 0, savedIds: [], data: [] };
    }

    const savedIds = Array.from(new Set((savedRows || []).map(r => r.propertyId)));
    if (savedIds.length === 0) {
      return { success: true, count: 0, savedIds: [], data: [] };
    }

    const allProps = await this.getProperties();
    const matched = allProps.filter(p => savedIds.includes(p.id));

    return {
      success: true,
      count: matched.length,
      savedIds,
      data: matched
    };
  },

  async toggleSaved(propertyId, _token, _userId) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) throw new ApiError('Authentication required.', 401);

    const candidateIds = await getUserCandidateIds(authUser);

    // Check if already saved under any candidate ID
    const { data: existing } = await supabase
      .from('saved_properties')
      .select('id')
      .in('userId', candidateIds)
      .eq('propertyId', propertyId)
      .maybeSingle();

    let isSaved = false;

    if (existing) {
      await supabase
        .from('saved_properties')
        .delete()
        .in('userId', candidateIds)
        .eq('propertyId', propertyId);
      isSaved = false;
    } else {
      await supabase
        .from('saved_properties')
        .insert([{ userId: authUser.id, propertyId }]);
      isSaved = true;
    }

    const { data: all } = await supabase
      .from('saved_properties')
      .select('propertyId')
      .in('userId', candidateIds);

    const savedIds = Array.from(new Set((all || []).map(r => r.propertyId)));

    return {
      success: true,
      isSaved,
      savedIds,
      message: isSaved ? 'Property saved to favorites' : 'Property removed from favorites'
    };
  }
};
