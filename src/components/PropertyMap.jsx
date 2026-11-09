/**
 * src/components/PropertyMap.jsx
 * Real OpenStreetMap view (Leaflet) with price pins, the FSUU campus marker
 * and the certified high-ground overlay. No API key, no billing account.
 */
import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  ZoomControl,
  AttributionControl,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import {
  ACTIVE_TILES,
  CAMPUS,
  CAMPUS_SUBLABEL,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  FLOOD_ZONE,
  resolveCoordinates,
  formatPriceLabel
} from '../lib/mapConfig';

const SCHOOL_ICON = `
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
       fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"
       stroke-linejoin="round" aria-hidden="true">
    <path d="M14 22v-4a2 2 0 1 0-4 0v4" />
    <path d="m18 10 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-7.382a1 1 0 0 1 .553-.894L6 10" />
    <path d="M18 5v17" />
    <path d="m4 6 7.106-3.553a2 2 0 0 1 1.788 0L20 6" />
    <path d="M6 5v17" />
    <circle cx="12" cy="9" r="2" />
  </svg>
`;

function pinIcon(property, active, compact) {
  const verified = Boolean(property?.badges?.isUriosVerified);
  const price = Number(property?.price) || 0;

  const pillClass = active
    ? 'bg-amber-400 text-slate-950 ring-4 ring-amber-300/70'
    : verified
      ? 'bg-emerald-800 text-white border border-emerald-400'
      : 'bg-[#0b1a30] text-white border border-white/20';

  const glyph = verified
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
          fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
          stroke-linejoin="round" class="${active ? 'text-slate-900' : 'text-amber-300'}" aria-hidden="true">
         <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
         <path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" stroke-width="2.2"/>
       </svg>`
    : `<span class="w-1.5 h-1.5 rounded-full ${active ? 'bg-slate-950' : 'bg-emerald-400'}"></span>`;

  return L.divIcon({
    className: 'serjon-map-pin',
    html: `
      <div class="serjon-pin-inner">
        <div class="serjon-pin-pill flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black shadow-lg ${pillClass}">
          ${glyph}
          <span>${formatPriceLabel(price, compact)}</span>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
}

const campusIcon = L.divIcon({
  className: 'serjon-map-pin',
  html: `
    <div class="serjon-pin-inner">
      <div class="flex flex-col items-center rounded-2xl bg-[#0b1a30] text-white px-3 py-2 shadow-xl border-2 border-amber-400 text-center">
        <span class="text-amber-300">${SCHOOL_ICON}</span>
        <span class="text-[10px] font-black leading-tight mt-0.5 whitespace-nowrap">FSUU MAIN</span>
        <span class="text-[8px] text-blue-200 font-semibold whitespace-nowrap">${CAMPUS_SUBLABEL.replace(/&/g, '&amp;')}</span>
      </div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

const pickerIcon = L.divIcon({
  className: 'serjon-map-pin',
  html: `
    <div class="serjon-pin-inner">
      <div class="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400 text-slate-950 shadow-xl border-2 border-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"
             stroke-linejoin="round" aria-hidden="true">
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0]
});

/** Keeps the canvas in sync with the container, fits all pins, follows focus. */
function MapEffects({ pins, focusId }) {
  const map = useMap();
  const pinKey = pins.map(({ property }) => property.id).join('|');
  const fittedForRef = React.useRef(null);

  const tryFit = () => {
    if (fittedForRef.current === pinKey || !pins.length) return;
    const container = map.getContainer();
    const { width, height } = container.getBoundingClientRect();
    // The desktop map mounts inside a `hidden lg:block` wrapper, so Leaflet may
    // start with a 0x0 canvas. Wait until it actually has a size.
    if (width < 2 || height < 2) return;

    if (pins.length === 1) {
      map.setView([pins[0].position.lat, pins[0].position.lng], 18, { animate: false });
    } else {
      const bounds = L.latLngBounds(pins.map(({ position }) => [position.lat, position.lng]));
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 18, animate: false });
    }
    fittedForRef.current = pinKey;
  };

  // Leaflet needs a nudge whenever its container changes size (sidebar,
  // full-screen toggle, window resize, or becoming visible).
  useEffect(() => {
    const container = map.getContainer();
    map.invalidateSize();
    tryFit();

    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      map.invalidateSize();
      tryFit();
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pinKey]);

  useEffect(() => {
    if (!focusId) return;
    const hit = pins.find(({ property }) => property.id === focusId);
    if (!hit) return;
    const point = [hit.position.lat, hit.position.lng];
    if (!map.getBounds().pad(-0.2).contains(point)) {
      map.panTo(point, { animate: true, duration: 0.35 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  return null;
}

export default function PropertyMap({
  properties = [],
  selectedId = null,
  onSelectProperty,
  onHoverProperty,
  floodFreeOnly = false,
  compact = false,
  scrollWheelZoom = true,
  className = ''
}) {
  const pins = useMemo(
    () =>
      properties.map((property) => ({
        property,
        position: resolveCoordinates(property)
      })),
    [properties]
  );

  // Stable icon instances so react-leaflet doesn't call setIcon on every render.
  const icons = useMemo(() => {
    const registry = new Map();
    for (const { property } of pins) {
      registry.set(`${property.id}:0`, pinIcon(property, false, compact));
      registry.set(`${property.id}:1`, pinIcon(property, true, compact));
    }
    return registry;
  }, [pins, compact]);

  return (
    <MapContainer
      center={[CAMPUS.lat, CAMPUS.lng]}
      zoom={DEFAULT_ZOOM}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={scrollWheelZoom}
      fadeAnimation={false}
      className={`serjon-map ${className}`}
    >
      <TileLayer
        url={ACTIVE_TILES.url}
        attribution={ACTIVE_TILES.attribution}
        maxZoom={ACTIVE_TILES.maxZoom}
        maxNativeZoom={ACTIVE_TILES.maxZoom}
      />

      <ZoomControl position="bottomright" />
      <AttributionControl position="bottomleft" prefix={false} />

      <MapEffects pins={pins} focusId={selectedId} />

      {/* Certified high-ground contour */}
      <Circle
        center={[FLOOD_ZONE.lat, FLOOD_ZONE.lng]}
        radius={FLOOD_ZONE.radiusMeters}
        pathOptions={{
          color: '#10b981',
          weight: 2,
          dashArray: '7 7',
          fillColor: '#34d399',
          fillOpacity: floodFreeOnly ? 0.14 : 0.04,
          opacity: floodFreeOnly ? 0.95 : 0.14
        }}
        interactive={false}
      />

      {/* FSUU Main Campus landmark */}
      <Marker
        position={[CAMPUS.lat, CAMPUS.lng]}
        icon={campusIcon}
        interactive={false}
        keyboard={false}
        zIndexOffset={-200}
      />

      {pins.map(({ property, position }) => {
        const isActive = property.id === selectedId;
        return (
          <Marker
            key={property.id}
            position={[position.lat, position.lng]}
            icon={icons.get(`${property.id}:${isActive ? 1 : 0}`)}
            alt={property.name || 'Student pad'}
            title={property.name || ''}
            zIndexOffset={isActive ? 1000 : 0}
            riseOnHover
            eventHandlers={{
              click: () => onSelectProperty?.(property),
              mouseover: () => onHoverProperty?.(property)
            }}
          />
        );
      })}
    </MapContainer>
  );
}

/** Small click-to-place map used by the landlord editor. */
function PickerClickCatcher({ onChange }) {
  useMapEvents({
    click(event) {
      onChange?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });
  return null;
}

function PickerRecenter({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const point = [lat, lng];
    if (!map.getBounds().pad(-0.25).contains(point)) {
      map.panTo(point, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
}

export function LocationPickerMap({ value, onChange, className = '', route = null }) {
  const hasValue =
    value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng));
  const position = hasValue ? [Number(value.lat), Number(value.lng)] : null;
  const routePath = Array.isArray(route) && route.length > 1 ? route : null;

  return (
    <MapContainer
      center={position || [CAMPUS.lat, CAMPUS.lng]}
      zoom={position ? 18 : 16}
      minZoom={MIN_ZOOM}
      maxZoom={MAX_ZOOM}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      fadeAnimation={false}
      className={`serjon-map serjon-map--picker ${className}`}
    >
      <TileLayer
        url={ACTIVE_TILES.url}
        attribution={ACTIVE_TILES.attribution}
        maxZoom={ACTIVE_TILES.maxZoom}
        maxNativeZoom={ACTIVE_TILES.maxZoom}
      />
      <AttributionControl position="bottomleft" prefix={false} />
      <PickerClickCatcher onChange={onChange} />
      <PickerRecenter lat={Number(value?.lat)} lng={Number(value?.lng)} />

      <Marker
        position={[CAMPUS.lat, CAMPUS.lng]}
        icon={campusIcon}
        interactive={false}
        keyboard={false}
        zIndexOffset={0}
      />

      {/* The path the distance is measured on: the real walking route when the
          router answered, otherwise the straight-line fallback. Distinct keys
          force a fresh Leaflet layer — otherwise setStyle() merges the two and
          the routed line keeps the fallback's dashes. */}
      {routePath ? (
        <Polyline
          key={`route-${routePath.length}-${routePath[0]?.join(',')}`}
          positions={routePath}
          pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.9 }}
          interactive={false}
        />
      ) : position ? (
        <Polyline
          key="straight-line-fallback"
          positions={[[CAMPUS.lat, CAMPUS.lng], position]}
          pathOptions={{ color: '#f59e0b', weight: 2.5, opacity: 0.85, dashArray: '6 8' }}
          interactive={false}
        />
      ) : null}

      {position && (
        <Marker
          position={position}
          icon={pickerIcon}
          draggable
          title="Drag to adjust the exact location"
          eventHandlers={{
            dragend: (event) => {
              const { lat, lng } = event.target.getLatLng();
              onChange?.({ lat, lng });
            }
          }}
        />
      )}
    </MapContainer>
  );
}
