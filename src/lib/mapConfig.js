/**
 * src/lib/mapConfig.js
 * Shared geographic settings for the Leaflet / OpenStreetMap view.
 *
 * Nothing here needs an API key. The map tiles are served by the
 * OpenStreetMap Foundation under their tile usage policy, which is free for
 * normal application traffic (see https://operations.osmfoundation.org/policies/tiles/).
 *
 * You can switch tile providers at any time with VITE_MAP_TILES in `.env`:
 *   VITE_MAP_TILES=osm          -> classic OpenStreetMap (default)
 *   VITE_MAP_TILES=carto-light  -> muted, "Google-like" light basemap
 *   VITE_MAP_TILES=carto-voyager-> soft coloured basemap
 */

// Father Saturnino Urios University — Main Campus, San Francisco St, Butuan City.
// Geocoded from OpenStreetMap (relation 13106278).
export const CAMPUS = { lat: 8.9481639, lng: 125.5418283 };
export const CAMPUS_LABEL = 'FSUU Main Campus';
export const CAMPUS_SUBLABEL = 'SF & JC Aquino Gates';

export const DEFAULT_ZOOM = 17;
export const MIN_ZOOM = 14;
export const MAX_ZOOM = 18;

// Highest zoom level the tile providers actually serve. It must stay above
// MAX_ZOOM: Leaflet refuses to request tiles when the map zoom exceeds the
// tile layer's maxZoom, which leaves the canvas blank at the highest zoom.
export const TILE_MAX_ZOOM = 19;

// Area covered by the old percentage-based pins ({x:0-100, y:0-100}).
// Roughly a 400m x 400m block around the campus.
export const LEGACY_SPAN = 0.0035;

export const TILE_SOURCES = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: TILE_MAX_ZOOM
  },
  'carto-light': {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    maxZoom: MAX_ZOOM
  },
  'carto-voyager': {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>',
    maxZoom: MAX_ZOOM
  }
};

const REQUESTED_TILES = import.meta.env.VITE_MAP_TILES;
export const ACTIVE_TILES = TILE_SOURCES[REQUESTED_TILES] || TILE_SOURCES.osm;

// Certified high-ground overlay. Drawn as a soft circle so it reads as a
// "contour" on the real basemap without pretending to be a legal boundary.
export const FLOOD_ZONE = {
  lat: 8.94805,
  lng: 125.5406,
  radiusMeters: 240,
  label: 'Certified High-Ground Zone (+2.4m)'
};

// ─── Coordinate helpers ──────────────────────────────────────────────────────

function toNumber(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

/** Small deterministic hash so demo pads without real coords get stable,
 *  non-overlapping pins instead of all stacking on the campus centre. */
function hashString(value) {
  let h = 2166136261;
  const text = String(value || 'pad');
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scatterFromId(id) {
  const h = hashString(id);
  const angle = ((h % 360) * Math.PI) / 180;
  const radius = 0.35 + (((h >>> 9) % 55) / 100); // 0.35 – 0.90
  const span = 0.0016; // ~175m
  return {
    lat: CAMPUS.lat + Math.sin(angle) * radius * span,
    lng: CAMPUS.lng + Math.cos(angle) * radius * span
  };
}

/**
 * Resolve the real position of a property, in order of preference:
 *   1. latitude / longitude columns (exact pin set by the landlord)
 *   2. legacy mapCoordinates {x,y} percentages mapped onto a campus box
 *   3. deterministic scatter around campus (demo rows only)
 */
export function resolveCoordinates(property) {
  if (!property) return { ...CAMPUS };

  const lat = toNumber(property.latitude);
  const lng = toNumber(property.longitude);
  if (lat !== null && lng !== null && lat !== 0 && lng !== 0) {
    return { lat, lng };
  }

  const coords = property.mapCoordinates || {};
  const x = toNumber(coords.x);
  const y = toNumber(coords.y);
  const isDefault = (x === null || x === 50) && (y === null || y === 50);
  if (!isDefault && x !== null && y !== null) {
    return {
      // y grows downwards on screen, so a smaller y means further north.
      lat: CAMPUS.lat + ((50 - y) / 50) * LEGACY_SPAN,
      lng: CAMPUS.lng + ((x - 50) / 50) * LEGACY_SPAN
    };
  }

  return scatterFromId(property.id || property.name);
}

export function hasExactCoordinates(property) {
  const lat = toNumber(property?.latitude);
  const lng = toNumber(property?.longitude);
  return lat !== null && lng !== null && lat !== 0 && lng !== 0;
}

export function formatPriceLabel(price, compact = false) {
  const value = Number(price) || 0;
  if (compact && value >= 1000) return `₱${(value / 1000).toFixed(1)}k`;
  return `₱${value.toLocaleString('en-PH')}`;
}
