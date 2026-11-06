/**
 * src/utils/checklist.js
 * The Student Reality Checklist utilities
 * Balay Urios (Serjon) - FSUU Student Housing Hub
 *
 * 6 Core Checklist Items:
 * 1. Building condition in good condition (rain or shine)
 * 2. Flood safe zone (elevation / dry footpath)
 * 3. Water system condition (overhead tank + booster pump)
 * 4. Brownout resilience condition (solar backup / generator)
 * 5. Mobile data speed (DITO, Smart, Globe providers)
 * 6. Wi-Fi speed (Mbps download / upload)
 *
 * Two independent things describe every item:
 *   • the landlord's CLAIM   (floodRating.badge, waterSystem.hasBoosterPump, …)
 *   • the FSUU auditor's VERDICT (badges.verifiedItems[key])
 *
 * They are never mixed here: an audited item with no claim still renders as
 * "not declared", and a detailed claim is never dressed up as audited. Every
 * surface (feed cards, tag row, pad profile, admin audit) reads its state from
 * this module so badges, filters and counts can never contradict each other.
 */

import { formatDistance } from './distance';

// Display metadata, in checklist order. `key` is the `verifiedItems` key.
export const CHECKLIST_ITEMS = [
  {
    key: 'goodCondition',
    label: 'Good Condition (Rain or Shine)',
    shortLabel: 'Rain or Shine',
    hint: 'All-weather roof, covered corridors & ventilation'
  },
  {
    key: 'flood',
    label: 'Flood Zone Audit & Elevation',
    shortLabel: 'Flood Safety',
    hint: 'Regional river surge audit & typhoon history'
  },
  {
    key: 'water',
    label: 'Water System Condition',
    shortLabel: 'Water System',
    hint: 'Overhead tank + automated booster pump'
  },
  {
    key: 'power',
    label: 'Brownout Resilience Condition',
    shortLabel: 'Blackout Resilience',
    hint: 'ANECO blackout resilience & charging backup'
  },
  {
    key: 'mobile',
    label: 'Mobile Data In-Room Signal',
    shortLabel: 'Mobile Signal',
    hint: 'DITO, Smart & Globe in-room signal bars'
  },
  {
    key: 'wifi',
    label: 'Wi-Fi Speedtest',
    shortLabel: 'Wi-Fi Speed',
    hint: 'On-site download / upload speedtest'
  }
];

export const CHECKLIST_ITEM_KEYS = CHECKLIST_ITEMS.map(item => item.key);

// Strings earlier versions of the pad editor wrote into claim fields when the
// host had not actually declared anything. They must never be rendered as a
// real claim, and must never be used to derive "has booster pump" style flags.
const EMPTY_CLAIM_TEXT = new Set([
  'not verified',
  'unverified',
  'not declared',
  'not declared yet',
  'not yet audited',
  'not audited',
  'pending',
  'pending audit',
  'pending independent audit',
  'host-declared',
  'host declared',
  'unknown',
  'n/a',
  'na',
  'no data',
  'tbd'
]);

/** True when a claim field is empty or only a legacy placeholder. */
export function isBlankClaim(value) {
  if (value === null || value === undefined) return true;
  const text = String(value).trim().toLowerCase();
  return text === '' || EMPTY_CLAIM_TEXT.has(text);
}

/** Trimmed claim text, or '' when it is empty / only a placeholder. */
export function normalizeClaim(value) {
  return isBlankClaim(value) ? '' : String(value).trim();
}

// Long-form placeholders written by earlier versions of the pad editor. They
// describe the *absence* of an audit, so rendering them under a green verdict
// pill is what made the checklist look broken.
const PLACEHOLDER_NARRATIVE =
  /^(host[- ]declared(\s+(flood|water system|backup power|building condition)\s+information)?\.?)?(\s*pending (independent |fsuu )?(physical )?audit\.?)?$|^building condition has not been audited yet\.?$|^not yet audited\.?$/i;

/**
 * Claim narrative with the old "host-declared … pending independent audit"
 * boilerplate stripped out. Real notes from the host are kept verbatim.
 */
export function normalizeNarrative(value) {
  const text = normalizeClaim(value);
  if (!text) return '';
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return PLACEHOLDER_NARRATIVE.test(collapsed) ? '' : text;
}

/** True when the declaration means "the host has no such feature". */
export function isNothingDeclared(value) {
  const text = normalizeClaim(value).toLowerCase();
  if (!text) return false;
  return /(^|[^a-z])(none|no backup|no generator|no genset|no wifi|no wi-fi|no in-house wi-fi|direct tap|direct city tap|no booster|no tank|grid only|no reserve tank)([^a-z]|$)/i.test(text);
}

/**
 * Per-item audit verdicts, keyed like `CHECKLIST_ITEMS`.
 *
 * Only `badges.verifiedItems` counts. Pads audited before per-item flags
 * existed carry just the pad-level `badges.isUriosVerified` seal, so that seal
 * is honoured for all six items — but a pad with *some* item flags never gets
 * the missing ones invented from the seal.
 */
export function getVerifiedItems(property) {
  const badges = property?.badges || {};
  const raw = badges.verifiedItems;
  const padVerified = Boolean(badges.isUriosVerified);

  const hasItemFlags =
    raw !== null &&
    typeof raw === 'object' &&
    (CHECKLIST_ITEM_KEYS.some(key => raw[key] !== undefined) ||
      // Very old rows stored the building-condition verdict as `distance`.
      raw.distance !== undefined);

  const legacyAllVerified = !hasItemFlags;

  const result = {};
  for (const key of CHECKLIST_ITEM_KEYS) {
    let value = raw?.[key];
    if (value === undefined && key === 'goodCondition') value = raw?.distance;
    result[key] = value === undefined
      ? (legacyAllVerified ? padVerified : false)
      : Boolean(value);
  }

  return result;
}

export function isChecklistItemVerified(property, key) {
  return Boolean(getVerifiedItems(property)[key]);
}

export function getChecklistVerifiedCount(property) {
  const verified = getVerifiedItems(property);
  return CHECKLIST_ITEM_KEYS.filter(key => verified[key]).length;
}

/** True when the host declared the building itself is in good condition. */
export function isGoodConditionClaimed(property) {
  return getChecklistClaims(property).goodCondition.isGood;
}

// ─── Per-item claim normalizers ──────────────────────────────────────────────

function buildGoodCondition(property, verified) {
  const raw = property?.buildingCondition || property?.badges?.buildingCondition || {};
  const status = normalizeClaim(raw.status);
  const badge = normalizeClaim(raw.badge);
  const roofCondition = normalizeClaim(raw.roofCondition ?? raw.roof);
  const drainage = normalizeClaim(raw.drainage ?? raw.monsoon);
  const ventilation = normalizeClaim(raw.ventilation ?? raw.sunny);
  const description = normalizeClaim(raw.description);
  const rating = normalizeClaim(raw.rating).toLowerCase();

  const declared = Boolean(
    status || badge || description || roofCondition || drainage || ventilation ||
    raw.isCertified === true || raw.audited === true
  );

  // `rating` is what the pad editor writes ('good' | 'fair' | 'poor'). Legacy
  // rows only carry free text, so fall back to reading the status/badge.
  const isGood = rating
    ? /^(good|excellent|great|new)/.test(rating)
    : /good condition|newly built|renovat|excellent|leak-free/i.test(`${status} ${badge}`);

  return {
    key: 'goodCondition',
    label: 'Good Condition (Rain or Shine)',
    declared,
    verified,
    rating,
    isGood: declared && isGood,
    status,
    displayStatus: status || (declared ? 'Condition declared' : 'Condition not declared'),
    badge,
    claimLabel: declared ? (badge || 'Host-declared') : 'Not declared yet',
    roofCondition,
    drainage,
    ventilation,
    description,
    isCertified: raw.isCertified === true || verified
  };
}

function buildFlood(property, verified) {
  const raw = property?.floodRating || {};
  const badge = normalizeClaim(raw.badge);
  const tagBadge = normalizeClaim(raw.tagBadge);
  const elevation = normalizeClaim(raw.elevation);
  const description = normalizeClaim(raw.description);
  const history = normalizeClaim(raw.history);

  const declared = Boolean(
    badge || tagBadge || elevation || description || history ||
    raw.isFloodFree !== undefined
  );

  let isFloodFree = null;
  if (raw.isFloodFree !== undefined && raw.isFloodFree !== null) {
    isFloodFree = Boolean(raw.isFloodFree);
  } else if (declared) {
    const text = `${badge} ${tagBadge} ${elevation}`;
    if (isNothingDeclared(badge) || /flood[- ]?prone|watch zone|surge risk/i.test(text)) {
      isFloodFree = false;
    } else if (/flood[- ]?safe|zero recorded|elevated|second floor|dry/i.test(text)) {
      isFloodFree = true;
    }
  }

  return {
    key: 'flood',
    label: 'Flood Zone Audit & Elevation',
    declared,
    verified,
    isFloodFree,
    isSafe: isFloodFree === true,
    elevation: elevation || (declared ? (isFloodFree ? 'Elevated dry zone' : 'Ground level') : ''),
    badge: badge || (declared ? 'Flood information declared' : ''),
    tagBadge: tagBadge || (declared ? 'Host-declared' : 'Not declared'),
    claimLabel: declared ? (tagBadge || badge || 'Host-declared') : 'Not declared yet',
    displayBadge: declared
      ? (badge || (isFloodFree ? 'Flood-Safe Zone' : 'Flood Watch Zone'))
      : 'Flood safety not declared',
    description,
    history
  };
}

function buildWater(property, verified) {
  const raw = property?.waterSystem || {};
  const badge = normalizeClaim(raw.badge);
  const capacity = normalizeClaim(raw.tankCapacity);
  const description = normalizeClaim(raw.description);

  const declared = Boolean(
    badge || capacity || description ||
    raw.hasBoosterPump !== undefined || raw.hasReserveTank !== undefined
  );
  const declaredNone = declared && (isNothingDeclared(badge) || (!raw.hasReserveTank && !raw.hasBoosterPump && /direct (city )?tap/i.test(badge)));

  const claimText = `${badge} ${capacity}`;
  const hasTank = declared && !declaredNone &&
    (raw.hasReserveTank !== undefined ? Boolean(raw.hasReserveTank) : /tank|cistern|deep well|reservoir/i.test(claimText));
  const hasBooster = declared && !declaredNone &&
    (raw.hasBoosterPump !== undefined ? Boolean(raw.hasBoosterPump) : /booster|auto pump|water pump/i.test(claimText));

  return {
    key: 'water',
    label: 'Water System Condition',
    declared,
    verified,
    declaredNone,
    hasTank,
    hasReserveTank: hasTank,
    hasBooster,
    hasBoosterPump: hasBooster,
    hasBackup: hasTank || hasBooster,
    capacity,
    tankCapacity: capacity,
    badge: badge || (declared ? 'Water system declared' : ''),
    claimLabel: declared ? (badge || 'Host-declared') : 'Not declared yet',
    displayBadge: !declared
      ? 'Water system not declared'
      : declaredNone
        ? 'Direct City Tap Only'
        : (badge || 'Tank & Booster Water'),
    description
  };
}

function buildPower(property, verified) {
  const raw = property?.powerSystem || {};
  const badge = normalizeClaim(raw.badge);
  const description = normalizeClaim(raw.description);

  const declared = Boolean(
    badge || description ||
    raw.hasSolarBackup !== undefined || raw.hasGenerator !== undefined
  );
  const declaredNone = declared && isNothingDeclared(badge);

  const hasSolar = declared && !declaredNone &&
    (raw.hasSolarBackup !== undefined ? Boolean(raw.hasSolarBackup) : /solar/i.test(badge));
  const hasGenerator = declared && !declaredNone &&
    (raw.hasGenerator !== undefined ? Boolean(raw.hasGenerator) : /generator|genset/i.test(badge));

  return {
    key: 'power',
    label: 'Brownout Resilience Condition',
    declared,
    verified,
    declaredNone,
    hasSolar,
    hasSolarBackup: hasSolar,
    hasGenerator,
    hasBackup: hasSolar || hasGenerator,
    badge: badge || (declared ? 'Backup power declared' : ''),
    claimLabel: declared ? (badge || 'Host-declared') : 'Not declared yet',
    displayBadge: !declared
      ? 'Backup power not declared'
      : declaredNone
        ? 'Standard Grid (No Backup)'
        : (badge || (hasSolar ? 'Solar Backup' : 'Standby Generator')),
    description
  };
}

function parseCarrier(rawText) {
  const text = normalizeClaim(rawText);
  if (!text) {
    return { declared: false, text: '', is5G: false, isFull: false, badge: 'Not measured' };
  }
  const is5G = /5g/i.test(text);
  const isFull = /full|5 bars|4 bars|solid|strong/i.test(text);
  return {
    declared: true,
    text,
    is5G,
    isFull,
    badge: is5G ? (isFull ? '5G Full Bars' : '5G') : '4G LTE'
  };
}

function buildMobile(property, verified) {
  const raw = property?.wifiAudit || {};
  const signals = raw.carrierSignals && typeof raw.carrierSignals === 'object'
    ? raw.carrierSignals
    : {};

  const globe = parseCarrier(signals.globe);
  const smart = parseCarrier(signals.smart);
  const dito = parseCarrier(signals.dito);
  const carrierCount = [globe, smart, dito].filter(carrier => carrier.declared).length;

  return {
    key: 'mobile',
    label: 'Mobile Data In-Room Signal',
    declared: carrierCount > 0,
    verified,
    globe,
    smart,
    dito,
    carrierCount,
    carrierCountLabel: carrierCount === 0
      ? 'No carrier signals measured yet'
      : `${carrierCount}/3 carriers declared`,
    has5G: globe.is5G || smart.is5G || dito.is5G,
    claimLabel: carrierCount > 0 ? `${carrierCount}/3 carriers declared` : 'Not measured yet',
    badge: carrierCount > 0
      ? '📶 Mobile: DITO • Smart • Globe'
      : '📶 Mobile signal not measured yet',
    description: ''
  };
}

function buildWifi(property, verified) {
  const raw = property?.wifiAudit || {};
  const provider = normalizeClaim(raw.provider);
  const downloadMbps = Math.max(0, Number(raw.downloadMbps) || 0);
  const uploadMbps = Math.max(0, Number(raw.uploadMbps) || 0);
  const hasAuditDate = Boolean(normalizeClaim(raw.verifiedDate));

  const declared = Boolean(
    provider ||
    raw.hasWifi === true ||
    raw.hasWifi === false ||
    downloadMbps > 0 ||
    uploadMbps > 0
  );

  const explicitNone =
    raw.hasWifi === false ||
    /^none/i.test(provider) ||
    /no wi-?fi/i.test(provider) ||
    (downloadMbps === 0 && !provider);

  const hasWifi = declared && !explicitNone;

  return {
    key: 'wifi',
    label: 'Wi-Fi Speedtest',
    declared,
    verified,
    hasWifi,
    downloadMbps: hasWifi ? downloadMbps : 0,
    uploadMbps: hasWifi ? uploadMbps : 0,
    isSpeedMeasured: hasWifi && downloadMbps > 0,
    provider: declared ? (hasWifi ? (provider || 'Wi-Fi provided') : 'None (No Wi-Fi Provided)') : 'Not declared',
    verifiedDate: normalizeClaim(raw.verifiedDate),
    hasAuditDate,
    ratingBadge: normalizeClaim(raw.ratingBadge) || (
      !declared
        ? 'Not declared'
        : hasWifi
          ? (downloadMbps > 0 ? `${downloadMbps} Mbps Wi-Fi` : 'Wi-Fi provided (speed not measured)')
          : 'No Wi-Fi Provided'
    ),
    claimLabel: !declared
      ? 'Not declared yet'
      : hasWifi
        ? (downloadMbps > 0 ? `${downloadMbps} Mbps` : 'Wi-Fi provided')
        : 'No in-house Wi-Fi',
    isFast: hasWifi && downloadMbps >= 45,
    isUltraFast: hasWifi && downloadMbps >= 60,
    badge: !declared
      ? '🌐 Wi-Fi not declared yet'
      : hasWifi
        ? (downloadMbps > 0 ? `🌐 ${downloadMbps} Mbps Fiber Wi-Fi` : '🌐 Wi-Fi provided')
        : '❌ No In-House Wi-Fi'
  };
}

/**
 * Everything the checklist surfaces need, normalized and claim-aware.
 * Nothing is invented: undeclared items report `declared: false`.
 */
export function getChecklistClaims(property) {
  if (!property) return null;

  const verified = getVerifiedItems(property);

  const mainGate = property.gateProximities?.mainSFGate;
  const walkMinutes = Number(mainGate?.walkingMinutes) || 0;
  const distanceMeters = Number(mainGate?.distanceMeters) || 0;

  return {
    goodCondition: buildGoodCondition(property, verified.goodCondition),
    floodSafe: buildFlood(property, verified.flood),
    waterSystem: buildWater(property, verified.water),
    brownoutResilience: buildPower(property, verified.power),
    mobileData: buildMobile(property, verified.mobile),
    wifi: buildWifi(property, verified.wifi),
    verifiedItems: verified,
    distance: {
      minutes: walkMinutes,
      meters: distanceMeters,
      label: walkMinutes > 15
        ? `Trike ride to campus (${formatDistance(distanceMeters) || 'far'})`
        : `${walkMinutes} min walk${distanceMeters ? ` (${formatDistance(distanceMeters)})` : ''}`,
      isSuperClose: walkMinutes > 0 && walkMinutes <= 5,
      isWalkable: walkMinutes > 0 && walkMinutes <= 12
    }
  };
}

/** Backwards-compatible alias used by the feed cards. */
export function getStudentChecklist(property) {
  return getChecklistClaims(property);
}
