/**
 * Unit tests for the AI needs contract — run with `npm run test:ai`.
 *
 * These cover the part that protects the UI from the model: unknown listing ids,
 * out-of-range budgets, invented zones/amenities and malformed JSON must all be
 * dropped before anything is rendered.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_MAX_CATALOG,
  assessNeeds,
  buildCatalog,
  buildGeminiRequest,
  buildNeedPatch,
  compactListing,
  normalizeAiResult,
  normalizeNeedFilter,
  parseAiJson,
  rankMatches
} from '../src/services/ai/aiNeeds.js';

const PROPERTIES = [
  {
    id: 'p1',
    name: 'San Ignacio Pad',
    zone: 'San Ignacio',
    area: 'Near FSUU',
    price: 3200,
    roomType: 'Solo Room',
    gender: 'Female Only',
    availableCount: 2,
    badges: { isUriosVerified: true },
    amenities: ['Inverter Aircon', 'Study Table & Chair'],
    gateProximities: { mainSFGate: { walkingMinutes: 4, distanceMeters: 300 } },
    floodRating: { isFloodFree: true },
    waterSystem: { hasBoosterPump: true, hasReserveTank: true },
    powerSystem: { hasSolarBackup: true, hasGenerator: false },
    wifiAudit: { downloadMbps: 55, carrierSignals: { globe: '5G', smart: '4G', dito: 'weak' } },
    rules: [{ title: 'No Curfew', curfew: false }]
  },
  {
    id: 'p2',
    name: 'Rizal Bedspace',
    zone: 'Rizal Street',
    price: 2100,
    roomType: 'Bedspace',
    gender: 'Mixed',
    availableCount: 0,
    badges: { isUriosVerified: false },
    amenities: [],
    gateProximities: {},
    floodRating: {},
    waterSystem: {},
    powerSystem: {},
    wifiAudit: {},
    rules: []
  },
  {
    id: 'p3',
    name: 'Single Room Near Gate',
    zone: 'San Ignacio',
    price: 4500,
    roomType: 'Single Room',
    gender: 'Male Only',
    availableCount: 1,
    badges: { isUriosVerified: false },
    amenities: [{ name: 'Free Purified Drinking Water' }],
    gateProximities: { mainSFGate: { walkingMinutes: 12, distanceMeters: 900 } },
    rules: [{ title: 'Gate closes 10pm' }]
  }
];

// ── catalog ───────────────────────────────────────────────────────────────────

test('buildCatalog exposes zones and amenities from the live data', () => {
  const context = buildCatalog(PROPERTIES);

  assert.deepEqual(context.zones, ['San Ignacio', 'Rizal Street']);
  assert.ok(context.amenities.includes('Inverter Aircon'));
  assert.ok(context.amenities.includes('Free Purified Drinking Water'));
  assert.equal(context.total, 3);
  assert.equal(context.truncated, false);
  assert.equal(context.catalog.length, 3);
});

test('buildCatalog never offers "All Zones" as a zone', () => {
  const context = buildCatalog([
    ...PROPERTIES,
    { id: 'p4', name: 'X', zone: 'All Zones', price: 1000, amenities: [] }
  ]);
  assert.ok(!context.zones.includes('All Zones'));
});

test('buildCatalog caps large catalogs and reports the truncation', () => {
  const many = Array.from({ length: AI_MAX_CATALOG + 5 }, (_, index) => ({
    id: `bulk-${index}`,
    name: `Bulk ${index}`,
    zone: 'San Ignacio',
    price: 2000 + index,
    availableCount: 1,
    amenities: []
  }));
  const context = buildCatalog(many);
  assert.equal(context.catalog.length, AI_MAX_CATALOG);
  assert.equal(context.truncated, true);
  assert.equal(context.total, AI_MAX_CATALOG + 5);
});

test('compactListing marks missing audit data as unknown, not false', () => {
  const unknown = compactListing(PROPERTIES[1]);
  assert.equal(unknown.flood, null);
  assert.equal(unknown.water, null);
  assert.equal(unknown.power, null);
  assert.equal(unknown.wifi, null);
  assert.equal(unknown.noCurfew, null);
  assert.equal(unknown.walk, null);
});

test('compactListing reads the curfew marker from the rules array', () => {
  assert.equal(compactListing(PROPERTIES[0]).noCurfew, true);
  // No marker + rules present means the pad keeps its curfew.
  assert.equal(compactListing(PROPERTIES[2]).noCurfew, false);
  // No rules at all means we genuinely do not know.
  assert.equal(compactListing(PROPERTIES[1]).noCurfew, null);
});

// ── filters ───────────────────────────────────────────────────────────────────

test('normalizeNeedFilter only accepts values that exist in the catalog', () => {
  const filter = normalizeNeedFilter(
    {
      maxBudget: 250,
      gender: 'Co-ed',
      zone: 'Nowhere Land',
      roomType: 'Dorm Pod',
      amenity: 'Jacuzzi',
      minWifiSpeed: 45,
      mobileProvider: 'GLOBE',
      floodFreeOnly: true,
      noCurfewOnly: 'yes please'
    },
    { zones: ['San Ignacio'], amenities: ['Inverter Aircon'] }
  );

  assert.equal(filter.maxBudget, 800); // clamped into the app's range
  assert.equal(filter.gender, undefined);
  assert.equal(filter.zone, undefined);
  assert.equal(filter.roomType, undefined);
  assert.equal(filter.amenity, undefined);
  assert.equal(filter.minWifiSpeed, 50); // snapped to a supported option
  assert.equal(filter.mobileProvider, 'globe');
  assert.equal(filter.floodFreeOnly, true);
  assert.equal(filter.noCurfewOnly, undefined); // only literal true counts
});

test('normalizeNeedFilter canonicalises zone, amenity and room wording', () => {
  const filter = normalizeNeedFilter(
    {
      zone: 'san ignacio',
      amenity: 'aircon',
      roomType: 'single room',
      maxBudget: '3500'
    },
    {
      zones: ['San Ignacio', 'Rizal Street'],
      amenities: ['Inverter Aircon', 'Study Table & Chair']
    }
  );

  assert.equal(filter.zone, 'San Ignacio');
  assert.equal(filter.amenity, 'Inverter Aircon');
  assert.equal(filter.roomType, 'Solo Room');
  assert.equal(filter.maxBudget, 3500);
});

// ── normalisation ─────────────────────────────────────────────────────────────

function contextFor(properties = PROPERTIES) {
  return buildCatalog(properties);
}

const RAW_ANSWER = {
  summary: 'You need a cheap, flood-safe solo room in San Ignacio.',
  followUp: 'Do you need aircon, or is an electric fan fine?',
  needs: [
    { id: 'budget', label: 'Up to ₱3,000 a month', detail: 'barato', kind: 'budget', priority: 'must', filter: { maxBudget: 3000 } },
    { id: 'flood', label: 'Flood-safe zone', detail: 'walay baha', kind: 'flood', priority: 'must', filter: { floodFreeOnly: true } },
    { id: 'zone', label: 'Near San Ignacio', detail: 'duol sa San Ignacio', kind: 'zone', priority: 'nice', filter: { zone: 'san ignacio' } },
    { id: 'quiet', label: 'Quiet for studying', detail: 'hilom', kind: 'quiet', priority: 'must' },
    { id: 'cap', label: 'Price sanity check', kind: 'budget', priority: 'nice', filter: { maxBudget: 999999 } },
    { id: 'aircon', label: 'Has aircon', kind: 'amenity', priority: 'nice', filter: { amenity: 'aircon' } }
  ],
  matches: [
    { id: 'p1', meets: ['budget', 'flood', 'not-a-need'], unsure: ['zone'], reason: '₱3,200 · flood-safe · 4 min walk' },
    { id: 'p2', meets: ['budget'], unsure: [], reason: '₱2,100 bedspace, audit data missing' },
    { id: 'p3', meets: [], unsure: ['flood'], reason: 'Above budget' },
    { id: 'ghost-listing', meets: ['budget'], reason: 'invented listing' }
  ]
};

test('normalizeAiResult keeps the real needs and drops the invented listing', () => {
  const context = contextFor();
  const result = normalizeAiResult(RAW_ANSWER, context);

  assert.equal(result.needs.length, 6);
  assert.deepEqual(result.needs.map((need) => need.id), ['budget', 'flood', 'zone', 'quiet', 'cap', 'aircon']);

  // Unknown listing ids never reach the UI.
  assert.deepEqual(result.matches.map((match) => match.id), ['p1', 'p2', 'p3']);

  // Unknown need ids are stripped from the verdicts.
  assert.deepEqual(result.matches[0].meets, ['budget', 'flood']);
  assert.ok(result.warnings.some((warning) => warning.includes('ghost-listing')));
});

test('normalizeAiResult clamps and canonicalises the model filters', () => {
  const context = contextFor();
  const result = normalizeAiResult(RAW_ANSWER, context);

  const byId = Object.fromEntries(result.needs.map((need) => [need.id, need]));
  assert.equal(byId.zone.filter.zone, 'San Ignacio');
  assert.equal(byId.aircon.filter.amenity, 'Inverter Aircon');
  assert.equal(byId.cap.filter.maxBudget, 8000);
  assert.deepEqual(byId.quiet.filter, {});
});

test('normalizeAiResult never trusts the model priority or kind blindly', () => {
  const result = normalizeAiResult(
    {
      needs: [
        { id: 'x', label: 'Something', kind: 'nonsense-kind', priority: 'ULTRA' },
        { id: 'x', label: 'Same slug', kind: 'budget', priority: 'must' },
        { id: '', label: '', kind: 'budget' }
      ],
      matches: []
    },
    contextFor()
  );

  assert.equal(result.needs.length, 2);
  assert.equal(result.needs[0].kind, 'other');
  assert.equal(result.needs[0].priority, 'nice');
  assert.equal(result.needs[1].priority, 'must');
  assert.notEqual(result.needs[0].id, result.needs[1].id);
});

test('normalizeAiResult survives a model that answers nothing useful', () => {
  const result = normalizeAiResult({}, contextFor());
  assert.deepEqual(result.needs, []);
  assert.deepEqual(result.matches, []);
  assert.ok(result.warnings.length > 0);
});

// ── patch + ranking ───────────────────────────────────────────────────────────

test('buildNeedPatch merges must-haves and ignores nice-to-haves', () => {
  const { needs } = normalizeAiResult(RAW_ANSWER, contextFor());
  const patch = buildNeedPatch(needs);

  assert.equal(patch.maxBudget, 3000); // min of the budget needs that are "must"
  assert.equal(patch.floodFreeOnly, true);
  assert.equal(patch.amenity, undefined); // aircon is a nice-to-have
  assert.equal(patch.zone, undefined); // zone is a nice-to-have
});

test('buildNeedPatch unions multiple amenity must-haves', () => {
  const needs = [
    { id: 'a', priority: 'must', filter: { amenity: 'Inverter Aircon' } },
    { id: 'b', priority: 'must', filter: { amenity: 'Study Table & Chair' } }
  ];
  const patch = buildNeedPatch(needs);
  assert.deepEqual(patch.amenity, ['Inverter Aircon', 'Study Table & Chair']);
});

test('buildNeedPatch can be restricted to satisfiable needs', () => {
  const needs = [
    { id: 'a', priority: 'must', filter: { maxBudget: 3000 } },
    { id: 'b', priority: 'must', filter: { floodFreeOnly: true } }
  ];
  const patch = buildNeedPatch(needs, ['a']);
  assert.equal(patch.maxBudget, 3000);
  assert.equal(patch.floodFreeOnly, undefined);
});

test('rankMatches puts the pads that prove more must-haves first', () => {
  const result = normalizeAiResult(RAW_ANSWER, contextFor());
  const ranked = rankMatches(result, result.needs.map((need) => need.id));

  assert.equal(ranked[0].id, 'p1');
  assert.equal(ranked[0].mustMet, 2);
  assert.ok(ranked[0].score > ranked[1].score);

  const p2 = ranked.find((match) => match.id === 'p2');
  assert.equal(p2.mustMet, 1);
  assert.ok(p2.missing.includes('zone')); // a nice-to-have it cannot prove
  assert.ok(p2.missing.includes('flood'));
});

test('rankMatches only counts the needs that are still active', () => {
  const result = normalizeAiResult(RAW_ANSWER, contextFor());
  const ranked = rankMatches(result, ['flood']);

  // Only p1 proves flood safety.
  assert.equal(ranked[0].id, 'p1');
  assert.equal(ranked[0].mustTotal, 1);
  assert.equal(ranked[0].mustMet, 1);

  const p2 = ranked.find((match) => match.id === 'p2');
  assert.equal(p2.mustMet, 0);
});

test('rankMatches with no active needs keeps every evaluated listing', () => {
  const result = normalizeAiResult(RAW_ANSWER, contextFor());
  const ranked = rankMatches(result, []);
  assert.equal(ranked.length, 3);
  assert.ok(ranked.every((match) => match.mustTotal === 0));
});

test('assessNeeds separates proven needs from unproven ones', () => {
  const result = normalizeAiResult(RAW_ANSWER, contextFor());
  const assessment = assessNeeds(result.needs, result.matches);

  assert.ok(assessment.proven.has('budget'));
  assert.ok(assessment.proven.has('flood'));
  assert.ok(assessment.unproven.has('zone')); // only ever "unsure"
  assert.ok(!assessment.proven.has('quiet'));
});

// ── parsing + request body ────────────────────────────────────────────────────

test('parseAiJson accepts plain, fenced and chatty answers', () => {
  assert.deepEqual(parseAiJson('{"a":1}'), { a: 1 });
  assert.deepEqual(parseAiJson('```json\n{"a":2}\n```'), { a: 2 });
  assert.deepEqual(parseAiJson('Here you go:\n{"a":3}\nThanks!'), { a: 3 });
  assert.throws(() => parseAiJson('no json here'), /JSON/);
});

test('buildGeminiRequest produces a JSON-mode request with the student sentence', () => {
  const context = contextFor();
  const request = buildGeminiRequest({
    query: 'Barato nga solo room duol sa San Ignacio, walay baha',
    catalog: context.catalog,
    zones: context.zones,
    amenities: context.amenities,
    model: 'gemini-3.6-flash'
  });

  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.deepEqual(request.generationConfig.thinkingConfig, { thinkingBudget: 0 });
  assert.ok(request.systemInstruction.parts[0].text.includes('Balay Urios'));

  const prompt = request.contents[0].parts[0].text;
  assert.ok(prompt.includes('Barato nga solo room'));
  assert.ok(prompt.includes('San Ignacio'));
  assert.ok(prompt.includes('"id":"p1"') || prompt.includes('"id": "p1"'));
  assert.ok(/never invent/i.test(prompt), 'the prompt must forbid invented facts');
});

test('buildGeminiRequest omits thinkingConfig for models that do not support it', () => {
  const context = contextFor();
  const request = buildGeminiRequest({
    query: 'need a cheap room',
    catalog: context.catalog,
    zones: context.zones,
    amenities: context.amenities,
    model: 'gemini-2.0-flash'
  });
  assert.equal(request.generationConfig.thinkingConfig, undefined);
});
