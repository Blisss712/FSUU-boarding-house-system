/**
 * src/services/api.js
 * Balay Urios (Serjon) – Supabase Auth & PostgreSQL Client
 *
 * Authentication is strictly and securely handled by Supabase Auth (supabase.auth).
 * Database operations interact with live Supabase PostgreSQL tables.
 */

import { supabase } from '../lib/supabase';

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

function publicUser(row) {
  if (!row) return null;
  const { passwordHash: _, ...safe } = row;
  if (safe.isAdmin || safe.role === 'admin') {
    safe.role = 'admin';
    safe.isAdmin = true;
  }
  return safe;
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
// helpers so that the My Listings view, the notification poller, and the chat
// inbox all agree with the database. This is what keeps the landlord hub in
// sync with Supabase.

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

// ─── Pure Supabase API Surface ───────────────────────────────────────────────

export const api = {
  // ── Properties ────────────────────────────────────────────────────────────

  async getProperties(params = {}) {
    const { data, error } = await supabase
      .from('properties')
      .select('*');

    if (error) {
      console.error('[Supabase getProperties error]:', error.message);
      throw new ApiError(`Supabase error: ${error.message}`, 500);
    }

    const formatted = (data || []).map(sanitizeRow);
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

    // Checklist filters
    if (minWalkMinutes) {
      const minMins = Number(minWalkMinutes);
      if (!isNaN(minMins) && minMins > 0) {
        list = list.filter(p => (p.gateProximities?.mainSFGate?.walkingMinutes ?? 99) >= minMins);
      }
    }

    if (maxWalkMinutes) {
      const maxMins = Number(maxWalkMinutes);
      if (!isNaN(maxMins) && maxMins > 0) {
        list = list.filter(p => (p.gateProximities?.mainSFGate?.walkingMinutes ?? 99) <= maxMins);
      }
    }

    if (minDistanceMeters) {
      const minD = Number(minDistanceMeters);
      if (!isNaN(minD) && minD > 0) {
        list = list.filter(p => (p.gateProximities?.mainSFGate?.distanceMeters ?? 9999) >= minD);
      }
    }

    if (maxDistanceMeters) {
      const maxD = Number(maxDistanceMeters);
      if (!isNaN(maxD) && maxD > 0) {
        list = list.filter(p => (p.gateProximities?.mainSFGate?.distanceMeters ?? 9999) <= maxD);
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
        const distA = a.gateProximities?.mainSFGate?.distanceMeters ?? 9999;
        const distB = b.gateProximities?.mainSFGate?.distanceMeters ?? 9999;
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

    return (data || []).map(sanitizeRow).filter(p => landlordOwnsProperty(p, identity));
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

    return data ? sanitizeRow(data) : null;
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
      rating: Number(propData.rating) || 0,
      reviewCount: Number(propData.reviewCount) || 0,
      landlord,
      images: Array.isArray(propData.images) ? propData.images : [],
      gateProximities: propData.gateProximities || {},
      trikeFare: propData.trikeFare || '',
      badges: propData.badges || {},
      mapCoordinates: propData.mapCoordinates || { x: 50, y: 50 },
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

    const { data, error } = await supabase
      .from('properties')
      .insert([record])
      .select()
      .maybeSingle();

    if (error) {
      console.error('[Supabase createProperty error]:', error.message);
      throw new ApiError(`Failed to publish pad: ${error.message}`, 500);
    }

    return sanitizeRow(data || record);
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

    // Do not overwrite ID
    delete payload.id;

    // Filter to known valid database columns to protect against PostgREST schema errors
    const VALID_PROPERTY_COLUMNS = [
      'name', 'campusId', 'zone', 'area', 'shortLocation', 'roomType',
      'gender', 'statusTag', 'statusColor', 'availableCount', 'price',
      'priceSubtext', 'advanceDeposit', 'minContract', 'rating', 'reviewCount',
      'landlord', 'images', 'gateProximities', 'trikeFare', 'badges',
      'mapCoordinates', 'buildingCondition', 'floodRating', 'waterSystem', 'powerSystem',
      'wifiAudit', 'commuteSteps', 'amenities', 'rules', 'vibeChecks',
      'povRoute', 'updatedAt'
    ];

    const safePayload = {};
    for (const key of VALID_PROPERTY_COLUMNS) {
      if (payload[key] !== undefined) {
        safePayload[key] = payload[key];
      }
    }

    const { data, error } = await supabase
      .from('properties')
      .update(safePayload)
      .eq('id', id)
      .select()
      .maybeSingle();

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
      verifiedItems: auditData.verifiedItems || currentBadges.verifiedItems || {
        goodCondition: true,
        flood: true,
        water: true,
        power: true,
        mobile: true,
        wifi: true
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

  // ── Chats (Real-Time Boarder <-> Landlord System) ───────────────────────

  /**
   * Helper to parse sender JSON or legacy string
   */
  _parseSender(rawSender, defaultLandlordName = 'Landlord') {
    if (!rawSender) {
      return { role: 'boarder', name: 'Boarder', userId: null, threadUserId: null };
    }
    if (typeof rawSender === 'object') {
      return {
        role: rawSender.role === 'landlord' ? 'landlord' : 'boarder',
        name: rawSender.name || (rawSender.role === 'landlord' ? defaultLandlordName : 'Boarder'),
        userId: rawSender.userId || null,
        threadUserId: rawSender.threadUserId || rawSender.userId || null,
        avatarInitials: rawSender.avatarInitials || (rawSender.role === 'landlord' ? 'LL' : 'ST')
      };
    }
    if (typeof rawSender === 'string' && rawSender.startsWith('{')) {
      try {
        const obj = JSON.parse(rawSender);
        return {
          role: obj.role === 'landlord' ? 'landlord' : 'boarder',
          name: obj.name || (obj.role === 'landlord' ? defaultLandlordName : 'Boarder'),
          userId: obj.userId || null,
          threadUserId: obj.threadUserId || obj.userId || null,
          avatarInitials: obj.avatarInitials || (obj.role === 'landlord' ? 'LL' : 'ST')
        };
      } catch {
        // Fall through
      }
    }
    const isLandlord = String(rawSender).toLowerCase().includes('landlord');
    return {
      role: isLandlord ? 'landlord' : 'boarder',
      name: isLandlord ? defaultLandlordName : 'Boarder',
      userId: null,
      threadUserId: null,
      avatarInitials: isLandlord ? 'LL' : 'ST'
    };
  },

  async getChatHistory(propertyId, threadUserId = null) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('propertyId', propertyId)
      .order('createdAt', { ascending: true });

    if (error) {
      console.error('[Supabase getChatHistory error]:', error.message);
      return [];
    }

    const prop = await this.getPropertyById(propertyId);
    const landlordName = prop?.landlord?.name || 'the Caretaker';
    const propName = prop?.name || 'our boarding pad';

    // If group chat is requested, use dedicated pad group method with announcements
    if (threadUserId === 'group') {
      return this.getPadGroupMessages(propertyId);
    }

    const defaultWelcome = {
      id: `chat-init-${propertyId}-${threadUserId || 'direct'}`,
      propertyId,
      sender: JSON.stringify({
        role: 'landlord',
        name: landlordName,
        threadUserId: threadUserId || null
      }),
      parsedSender: { role: 'landlord', name: landlordName, threadUserId: threadUserId || null },
      senderRole: 'landlord',
      senderName: landlordName,
      text: `Hello! I'm ${landlordName}. Welcome to ${propName}. Feel free to ask any questions about room availability, curfew, or amenities.`,
      time: '10:15 AM',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    };

    if (data && data.length > 0) {
      // Map and enrich each message
      const enriched = data.map(m => {
        const parsed = this._parseSender(m.sender, landlordName);
        return {
          ...m,
          parsedSender: parsed,
          senderRole: parsed.role,
          senderName: parsed.name,
          threadUserId: parsed.threadUserId
        };
      });

      // If a specific threadUserId is requested (e.g. student's direct conversation with host)
      if (threadUserId) {
        const directList = enriched.filter(m => {
          // Never leak group messages or announcement broadcasts into direct 1-on-1 host threads
          if (m.threadUserId === 'group' || m.isAnnouncement || m.text?.startsWith('📢')) return false;
          if (m.id.startsWith('chat-init-') || m.id === 'chat-001') return true;
          return m.threadUserId === threadUserId || (m.parsedSender?.userId === threadUserId && m.senderRole === 'boarder');
        });

        // Ensure host initial welcome greeting is always present at top
        const hasWelcome = directList.some(m => m.id.startsWith('chat-init-') || m.id === 'chat-001');
        if (!hasWelcome) {
          directList.unshift(defaultWelcome);
        }

        return directList;
      }

      // If no threadUserId specified (fallback), only return clean greeting
      return [defaultWelcome];
    }

    return [defaultWelcome];
  },

  async sendMessage(propertyId, text, senderParam = 'student', options = {}) {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new ApiError('Message cannot be empty', 400);
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Determine sender identity
    let role = 'boarder';
    let name = 'Boarder';
    let userId = null;
    let threadUserId = options.threadUserId || null;
    let avatarInitials = 'BD';

    if (typeof senderParam === 'object' && senderParam !== null) {
      role = senderParam.role === 'landlord' ? 'landlord' : 'boarder';
      name = senderParam.name || (role === 'landlord' ? 'Landlord' : 'Student Boarder');
      userId = senderParam.id || senderParam.userId || null;
      avatarInitials = senderParam.avatarInitials || (name ? name.substring(0, 2).toUpperCase() : 'BD');
      if (senderParam.threadUserId) threadUserId = senderParam.threadUserId;
    } else if (typeof senderParam === 'string') {
      role = (senderParam === 'landlord') ? 'landlord' : 'boarder';
      if (options.user) {
        name = options.user.name || (role === 'landlord' ? 'Landlord' : 'Student Boarder');
        userId = options.user.id || null;
        avatarInitials = options.user.avatarInitials || (name ? name.substring(0, 2).toUpperCase() : 'BD');
      }
    }

    // If boarder and no threadUserId yet, boarder is the thread owner
    if (role === 'boarder' && !threadUserId) {
      threadUserId = userId || `guest-${Date.now()}`;
    }

    const senderPayload = JSON.stringify({
      role,
      name,
      userId,
      threadUserId,
      avatarInitials
    });

    const msgRecord = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      propertyId,
      sender: senderPayload,
      text: trimmed,
      time: nowTime,
      createdAt: new Date().toISOString()
    };

    const { error: sendError } = await supabase.from('chats').insert([msgRecord]);
    if (sendError) {
      console.error('[Supabase sendMessage error]:', sendError.message);
      throw new ApiError(sendError.message, 500);
    }

    const formattedMessage = {
      ...msgRecord,
      parsedSender: { role, name, userId, threadUserId, avatarInitials },
      senderRole: role,
      senderName: name,
      threadUserId
    };

    return {
      success: true,
      data: {
        sentMessage: formattedMessage
      }
    };
  },

  /**
   * Fetches all active conversation threads for a user (Boarder or Landlord).
   * For Landlords: lists all boarders who messaged their properties.
   * For Boarders: lists all properties/landlords they messaged.
   */
  async getConversations(currentUser, allProperties = [], guestId = null) {
    let props = allProperties;
    if (!props || props.length === 0) {
      try {
        props = await this.getProperties();
      } catch {
        props = [];
      }
    }

    const isLandlord = currentUser?.role === 'landlord';

    if (isLandlord) {
      // Find properties owned or managed by this landlord (real DB identity only)
      const identity = {
        id: currentUser?.id,
        email: currentUser?.email,
        propertyId: currentUser?.propertyId
      };
      let landlordProps = props.filter(p => landlordOwnsProperty(p, identity));

      let propIds = landlordProps.map(p => p.id);
      if (propIds.length === 0 && currentUser.propertyId) {
        propIds.push(currentUser.propertyId);
      }

      if (propIds.length === 0) return [];

      const { data } = await supabase
        .from('chats')
        .select('*')
        .in('propertyId', propIds)
        .order('createdAt', { ascending: true });

      const threadsMap = new Map();

      // First, always register a Pad Group Chat head for each of the landlord's properties
      for (const prop of landlordProps) {
        const groupKey = `${prop.id}__group`;
        const groupMsgs = (data || []).filter(m => 
          m.propertyId === prop.id && (
            m.isAnnouncement || 
            (m.sender && typeof m.sender === 'string' && m.sender.includes('"threadUserId":"group"')) || 
            (m.text && m.text.startsWith('📢'))
          )
        );
        const latestGroup = groupMsgs[groupMsgs.length - 1];

        threadsMap.set(groupKey, {
          threadKey: groupKey,
          propertyId: prop.id,
          propertyName: prop.name,
          threadUserId: 'group',
          isGroupChat: true,
          type: 'group',
          title: `${prop.name} (Pad Group)`,
          boarderName: 'Pad Community & Announcements',
          landlordName: prop.landlord?.name || currentUser.name || 'Landlord',
          avatarInitials: '👥',
          badge: 'Group Chat',
          lastMessage: latestGroup?.text || '📢 [POWER] ANECO scheduled maintenance this Saturday 8:00 AM - 5:00 PM.',
          lastTime: latestGroup?.time || '08:30 AM',
          lastCreatedAt: latestGroup?.createdAt || new Date().toISOString(),
          messages: groupMsgs
        });
      }

      // Next, add individual student inquiries
      if (data && data.length > 0) {
        for (const m of data) {
          if (m.id.startsWith('chat-init-')) continue;
          const parsed = this._parseSender(m.sender);
          if (parsed.threadUserId === 'group' || parsed.isAnnouncement || (m.text && m.text.startsWith('📢'))) continue;

          const threadKey = `${m.propertyId}__${parsed.threadUserId || 'inquiry'}`;
          const prop = landlordProps.find(p => p.id === m.propertyId) || { id: m.propertyId, name: 'Boarding Pad' };

          let thread = threadsMap.get(threadKey);
          if (!thread) {
            thread = {
              threadKey,
              propertyId: m.propertyId,
              propertyName: prop.name,
              threadUserId: parsed.threadUserId || 'inquiry',
              isGroupChat: false,
              type: 'student',
              title: parsed.role === 'boarder' ? parsed.name : 'Inquiring Student',
              boarderName: parsed.role === 'boarder' ? parsed.name : 'Inquiring Student',
              avatarInitials: parsed.avatarInitials || (parsed.name ? parsed.name.substring(0, 2).toUpperCase() : 'ST'),
              badge: 'Student Inquiry',
              lastMessage: m.text,
              lastTime: m.time,
              lastCreatedAt: m.createdAt,
              lastSenderRole: parsed.role,
              messages: []
            };
            threadsMap.set(threadKey, thread);
          }

          if (parsed.role === 'boarder' && parsed.name && parsed.name !== 'Boarder') {
            thread.boarderName = parsed.name;
            thread.title = parsed.name;
          }

          thread.lastMessage = m.text;
          thread.lastTime = m.time;
          thread.lastCreatedAt = m.createdAt;
          thread.lastSenderRole = parsed.role;
          thread.messages.push({
            ...m,
            parsedSender: parsed,
            senderRole: parsed.role,
            senderName: parsed.name
          });
        }
      }

      return Array.from(threadsMap.values()).sort((a, b) => {
        if (a.isGroupChat && !b.isGroupChat) return -1;
        if (!a.isGroupChat && b.isGroupChat) return 1;
        return new Date(b.lastCreatedAt) - new Date(a.lastCreatedAt);
      });
    } else {
      // Boarder / Student / Guest view:
      const userId = currentUser?.id || guestId || 'guest-student';

      const { data: allChats } = await supabase
        .from('chats')
        .select('*')
        .order('createdAt', { ascending: true });

      const threadsMap = new Map();

      // Only properties that actually exist in Supabase are considered.
      const relevantProps = props;

      // Find active tenancy for student / boarder strictly from Supabase DB:
      let activeTenancyPropIds = new Set();

      if (currentUser?.id) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const candidateIds = await getUserCandidateIds(authUser || currentUser);
          if (currentUser?.id && !candidateIds.includes(currentUser.id)) {
            candidateIds.push(currentUser.id);
          }

          if (candidateIds.length > 0) {
            const { data: tenancyRows } = await supabase
              .from('tenancy')
              .select('*')
              .in('userId', candidateIds)
              .eq('isActive', 1)
              .order('id', { ascending: false });

            if (tenancyRows && tenancyRows.length > 0) {
              tenancyRows.forEach(t => {
                if (t.propertyId) activeTenancyPropIds.add(t.propertyId);
              });
            }
          }
        } catch (err) {
          console.warn('[getConversations tenancy check exception]:', err.message);
        }
      }

      // 1. Pad Group Chat Heads: TIED EXCLUSIVELY to the boarding house (tenant) you are currently boarded in!
      // If you left the boarding house or are not boarded, activeTenancyPropIds will be empty, so NO pad group appears.
      // If you are an active tenant in a pad, that boarding house's group chat appears in your messages.
      for (const propId of activeTenancyPropIds) {
        const prop = relevantProps.find(p => p.id === propId) || await this.getPropertyById(propId);
        if (!prop) continue;

        const groupKey = `${prop.id}__group`;
        const groupMsgs = (allChats || []).filter(m => 
          m.propertyId === prop.id && (
            m.isAnnouncement || 
            (m.sender && typeof m.sender === 'string' && m.sender.includes('"threadUserId":"group"')) || 
            (m.text && m.text.startsWith('📢'))
          ) && !m.id.startsWith('chat-init-') && m.id !== 'chat-001'
        );
        const latestGroup = groupMsgs[groupMsgs.length - 1];

        threadsMap.set(groupKey, {
          threadKey: groupKey,
          propertyId: prop.id,
          propertyName: prop.name,
          threadUserId: 'group',
          isGroupChat: true,
          type: 'group',
          title: `${prop.name} (Pad Group)`,
          landlordName: prop.landlord?.name || 'Host',
          boarderName: 'My Pad Community & Announcements',
          avatarInitials: '👥',
          badge: 'My Pad Group',
          lastMessage: latestGroup?.text || `Pad group for ${prop.name}`,
          lastTime: latestGroup?.time || '',
          lastCreatedAt: latestGroup?.createdAt || null,
          messages: groupMsgs
        });
      }

      // 2. Direct Landlord Chat Heads (only pads the student actually messaged or is boarded in)
      for (const prop of relevantProps) {
        const directKey = `${prop.id}__${userId}`;
        const directMsgs = (allChats || []).filter(m => {
          if (m.propertyId !== prop.id) return false;
          const parsed = this._parseSender(m.sender);
          if (parsed.threadUserId === 'group' || parsed.isAnnouncement || m.text?.startsWith('📢')) return false;
          // Must match current user's thread
          const isUserMsg = parsed.threadUserId === userId || (parsed.role === 'boarder' && (parsed.userId === userId || parsed.threadUserId === userId));
          return isUserMsg;
        });

        // Do not invent conversation heads for pads with no real messages.
        if (directMsgs.length === 0 && !activeTenancyPropIds.has(prop.id)) continue;

        const latestDirect = directMsgs[directMsgs.length - 1];

        threadsMap.set(directKey, {
          threadKey: directKey,
          propertyId: prop.id,
          propertyName: prop.name,
          threadUserId: userId,
          isGroupChat: false,
          type: 'landlord',
          title: prop.landlord?.name || 'Boarding Pad Host',
          landlordName: prop.landlord?.name || 'Boarding Pad Host',
          landlordTag: prop.landlord?.tag || 'Verified Urios Host',
          avatarInitials: prop.landlord?.initials || (prop.landlord?.name ? prop.landlord.name.substring(0, 2).toUpperCase() : 'BH'),
          avatarImage: prop.landlord?.avatar,
          badge: 'Host Direct',
          lastMessage: latestDirect?.text || `Inquire about ${prop.name}.`,
          lastTime: latestDirect?.time || '',
          lastCreatedAt: latestDirect?.createdAt || null,
          messages: directMsgs
        });
      }

      return Array.from(threadsMap.values()).sort((a, b) => {
        if (a.isGroupChat && !b.isGroupChat) return -1;
        if (!a.isGroupChat && b.isGroupChat) return 1;
        return new Date(b.lastCreatedAt) - new Date(a.lastCreatedAt);
      });
    }
  },

  // ── Pad Group Chat & Announcements ────────────────────────────────────────

  async getPadGroupMessages(propertyId) {
    if (!propertyId) return [];

    try {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('propertyId', propertyId)
        .order('createdAt', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const prop = await this.getPropertyById(propertyId);
        const landlordName = prop?.landlord?.name || 'Landlord Host';

        const groupMessages = data
          .map(m => {
            const parsed = this._parseSender(m.sender, landlordName);
            const isAnn = Boolean(
              parsed.isAnnouncement || 
              m.isAnnouncement || 
              (m.text && m.text.startsWith('📢'))
            );
            return {
              ...m,
              parsedSender: parsed,
              senderRole: parsed.role,
              senderName: parsed.name,
              threadUserId: parsed.threadUserId || (isAnn ? 'group' : null),
              isAnnouncement: isAnn,
              announcementCategory: parsed.announcementCategory || 'general'
            };
          })
          .filter(m => 
            (m.threadUserId === 'group' || m.isAnnouncement || (m.text && m.text.startsWith('📢'))) &&
            !m.id.startsWith('chat-init-') && m.id !== 'chat-001'
          );

        return groupMessages;
      }
    } catch (err) {
      console.warn('[Supabase getPadGroupMessages exception]:', err.message);
    }

    // No real group messages in Supabase yet: show an empty group instead of fake activity.
    return [];
  },

  async sendPadGroupMessage(propertyId, rawText, options = {}) {
    const text = rawText.trim();
    if (!text) throw new ApiError('Message text required', 400);

    const isAnnouncement = Boolean(options.isAnnouncement);
    const category = options.announcementCategory || 'general';
    const user = options.user;
    const isLandlord = user?.role === 'landlord';
    const role = isLandlord ? 'landlord' : 'boarder';
    const name = user?.name || (isLandlord ? 'Landlord Host' : 'Student Boarder');
    const avatarInitials = user?.avatarInitials || (name ? name.substring(0, 2).toUpperCase() : 'BD');
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const formattedText = isAnnouncement && !text.startsWith('📢')
      ? `📢 [${category.toUpperCase()}] ${text}`
      : text;

    const senderPayload = JSON.stringify({
      role,
      name,
      userId: user?.id || null,
      threadUserId: 'group',
      avatarInitials,
      isAnnouncement,
      announcementCategory: category
    });

    const msgRecord = {
      id: `grp-msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      propertyId,
      sender: senderPayload,
      text: formattedText,
      time: nowTime,
      createdAt: new Date().toISOString()
    };

    try {
      await supabase.from('chats').insert([msgRecord]);
    } catch (err) {
      console.warn('[Supabase sendPadGroupMessage error]:', err.message);
    }

    const sentMessage = {
      ...msgRecord,
      parsedSender: { role, name, userId: user?.id, threadUserId: 'group', avatarInitials, isAnnouncement, announcementCategory: category },
      senderRole: role,
      senderName: name,
      threadUserId: 'group',
      isAnnouncement,
      announcementCategory: category
    };

    return {
      success: true,
      data: { sentMessage }
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
      user: publicUser(formattedUser)
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
      return publicUser({
        ...profile,
        role: profileIsAdmin ? 'admin' : profile.role,
        isAdmin: profileIsAdmin,
        name: profile.name
      });
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
      'avatarInitials', 'propertyId'
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
