import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Building2, 
  MapPin, 
  Image as ImageIcon, 
  Check, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  Wifi, 
  Zap, 
  Droplets,  Footprints,
  Bus,
  AlertCircle,
  Clock,
  CloudSun,
  Signal
} from 'lucide-react';
import { api } from '../services/api';
import { getWalkingRoute } from '../services/routeApi';
import CurfewApprovalModal from './CurfewApprovalModal';
import { LocationPickerMap } from './PropertyMap';
import { padHasCurfew } from '../utils/curfew';
import {
  distanceMetersBetween,
  estimateCommuteMinutes,
  estimateWalkMinutes,
  formatDistance,
  MAX_DISTANCE_METERS,
  MIN_DISTANCE_METERS,
  normalizeDistanceMeters,
  WALK_METERS_PER_MINUTE
} from '../utils/distance';
import { normalizeClaim } from '../utils/checklist';
import { CAMPUS } from '../lib/mapConfig';

const PRESET_IMAGES = [
  { label: 'Clean Solo Room with Study Desk', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80' },
  { label: 'Modern Studio with Balcony', url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Spacious Bedspace with Locker', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80' },
  { label: 'Cozy En-Suite Student Pad', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80' },
  { label: 'Peaceful Boarding House Hallway', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80' }
];

/*
 * Section 4 choices.
 *
 * Every option carries its own structured claim flags, so the form writes
 * `hasBoosterPump`, `isFloodFree`, `hasSolarBackup`, … together with the wording
 * the student feed displays. Picking an option can therefore never save a badge
 * such as "Not verified" that the profile would then render as a real feature.
 * The empty value is a genuine third state: "the host has not declared this".
 */
const NOT_DECLARED = '';

const CONDITION_OPTIONS = [
  { value: NOT_DECLARED, label: 'Not declared yet' },
  { value: 'good', label: 'Good condition (rain or shine)', status: 'Good Condition (Rain or Shine)' },
  { value: 'fair', label: 'Fair — minor repairs noted', status: 'Fair — Minor Repairs Noted' },
  { value: 'poor', label: 'Needs repair (leaks / structural issues)', status: 'Needs Repair (Leaks / Structural Issues)' }
];

const CONDITION_DETAILS = [
  {
    key: 'roofCondition',
    label: 'Leak-free roof & ceiling',
    claim: 'Leak-free roof through monsoon rains'
  },
  {
    key: 'drainage',
    label: 'Covered, dry corridors',
    claim: 'Covered walkways & dry corridors'
  },
  {
    key: 'ventilation',
    label: 'Good ventilation & heat insulation',
    claim: 'Cross-ventilated & heat-insulated'
  }
];

const FLOOD_OPTIONS = [
  { value: NOT_DECLARED, label: 'Not declared yet' },
  {
    value: 'Flood-Safe Zone',
    label: 'Flood-safe (+2.4m elevation)',
    isFloodFree: true,
    elevation: '+2.4m High Ground Zone',
    tagBadge: 'Flood-Safe Zone'
  },
  {
    value: 'Zero Recorded Monsoon Flooding',
    label: 'Zero recorded monsoon flooding',
    isFloodFree: true,
    elevation: '+2.0m High Ground Zone',
    tagBadge: 'Dry Footpath'
  },
  {
    value: 'Second Floor Living Quarters',
    label: 'Second floor living quarters',
    isFloodFree: true,
    elevation: 'Elevated living quarters',
    tagBadge: 'Elevated Quarters'
  },
  {
    value: 'None (Flood-Prone / Ground Level)',
    label: 'None (flood-prone / ground level)',
    isFloodFree: false,
    elevation: 'Ground Level',
    tagBadge: 'Flood Watch Zone'
  }
];

const WATER_OPTIONS = [
  { value: NOT_DECLARED, label: 'Not declared yet' },
  {
    value: '24/7 Stainless Tank & Auto Pump',
    label: '24/7 stainless tank & pump',
    hasTank: true,
    hasBooster: true,
    tankCapacity: '1,000L Stainless Overhead Tank'
  },
  {
    value: 'Overhead Tank + Deep Well Backup',
    label: 'Overhead tank + deep well backup',
    hasTank: true,
    hasBooster: false,
    tankCapacity: 'Overhead Tank + Deep Well'
  },
  {
    value: 'City Water with Ground Cistern',
    label: 'City water with cistern',
    hasTank: true,
    hasBooster: false,
    tankCapacity: 'Ground Cistern'
  },
  {
    value: 'None (Direct City Tap Only)',
    label: 'None (direct city tap only)',
    hasTank: false,
    hasBooster: false,
    tankCapacity: ''
  }
];

const POWER_OPTIONS = [
  { value: NOT_DECLARED, label: 'Not declared yet' },
  { value: 'Solar Emergency Lighting & Backups', label: 'Solar emergency lighting', hasSolar: true, hasGenerator: false },
  { value: 'Generator-Supported Common Areas', label: 'Generator ready', hasSolar: false, hasGenerator: true },
  { value: 'Rechargeable LED Desk Stations', label: 'Rechargeable LED stations', hasSolar: false, hasGenerator: false },
  { value: 'None (No Generator or Backup Power)', label: 'None (no backup power)', hasSolar: false, hasGenerator: false }
];

/*
 * In-room SIM signal, measured per carrier. These live in
 * `wifiAudit.carrierSignals`, the same shape the student profile and the AI
 * search already read. checklist.js derives the "5G" / "full bars" badge from
 * the words "5G", "full", "strong" and "bars", so keep those in the values.
 */
const CARRIER_FIELDS = [
  { key: 'dito', label: 'DITO', accent: 'text-rose-700' },
  { key: 'smart', label: 'Smart', accent: 'text-emerald-700' },
  { key: 'globe', label: 'Globe', accent: 'text-blue-700' }
];

const CARRIER_OPTIONS = [
  { value: '', label: 'Not measured' },
  { value: 'Weak signal', label: 'Weak (1–2 bars)' },
  { value: '4G LTE', label: '4G LTE' },
  { value: '4G LTE • Full bars', label: '4G LTE · full bars' },
  { value: '5G', label: '5G' },
  { value: '5G • Full bars', label: '5G · full bars' }
];

const EMPTY_CARRIERS = { dito: '', smart: '', globe: '' };

// Pin → walking route tuning. A drag fires several events, so wait for the hand
// to settle before asking the routing proxy.
const ROUTE_DEBOUNCE_MS = 350;
// A pin this far from the nearest mapped footpath is worth calling out.
const ROUTE_SNAP_WARNING_METERS = 250;

function normalizeCarrierSignals(signals) {
  const out = {};
  for (const { key } of CARRIER_FIELDS) {
    const value = normalizeClaim(signals?.[key]);
    if (value) out[key] = value;
  }
  return out;
}

/** Finds the saved claim in an option list, matching value *or* label. */
function findOption(options, saved) {
  if (saved === null || saved === undefined) return null;
  const text = String(saved).trim().toLowerCase();
  if (!text) return null;
  return options.find(option => (
    option.value.toLowerCase() === text || option.label.toLowerCase() === text
  )) || null;
}

const COMMON_AMENITIES = [
  'Study Table & Chair',
  'Free Purified Drinking Water',
  '24/7 CCTV Security',
  'Biometric / RFID Gate Access',
  'Submetered Electric (₱14/kWh)',
  'Inverter Aircon',
  'Private En-Suite Bathroom',
  'Shared Kitchen & Induction Cooktop',
  'Refrigerator & Microwave Access',
  'Late Duty / Clinical Curfew Pass Accepted'
];

export default function PadEditorModal({
  isOpen,
  mode = 'add', // 'add' | 'edit'
  property,
  user,
  onSave,
  onDelete,
  onClose,
  focusLocation = false
}) {
  const isEdit = mode === 'edit' && Boolean(property);
  const locationSectionRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [roomType, setRoomType] = useState('Solo Pad / Private Room');
  const [gender, setGender] = useState('Co-ed Boarding House');
  const [price, setPrice] = useState('');
  const [priceSubtext, setPriceSubtext] = useState('/month');
  const [availableCount, setAvailableCount] = useState(1);
  const [advanceDeposit, setAdvanceDeposit] = useState('');
  const [minContract, setMinContract] = useState('');
  const [walkingMinutes, setWalkingMinutes] = useState('');
  // Ride time the feed advertises when "Commute minutes" is chosen. Kept in its
  // own state so a host can override the derived tricycle/jeepney estimate.
  const [commuteMinutes, setCommuteMinutes] = useState('');
  const [distanceMeters, setDistanceMeters] = useState('');
  // Where the distance came from: 'pin' = derived from the dropped map pin,
  // 'manual' = typed by the landlord. Both stay editable — the flag only lets
  // the form explain the current number and offer a one-tap re-derive.
  const [distanceSource, setDistanceSource] = useState('manual');
  // Non-blocking note about the pin itself (further than the 10 km cap, or
  // dropped inside the 20 m floor) so an obviously wrong pin is never silent.
  const [pinMetricNote, setPinMetricNote] = useState('');
  // Street route from the pin to campus (OSRM foot profile via /api/route).
  // `routeStatus` keeps the UI honest while the request is in flight: the
  // straight-line number is shown first, then replaced by the routed one.
  const [routeInfo, setRouteInfo] = useState(null);
  const [routeStatus, setRouteStatus] = useState('idle'); // idle | loading | routed | failed
  // Sequence guard: only the newest pin may write its route into the form.
  const routeRequestRef = useRef(0);
  // Set when the landlord types a number, so a slow route response can never
  // overwrite a value they entered by hand.
  const pinManuallyEditedRef = useRef(false);
  const routeTimerRef = useRef(null);
  // What the student feed advertises: walking minutes or commute minutes.
  const [feedMode, setFeedMode] = useState('walk');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [wifiSpeed, setWifiSpeed] = useState('');
  const [wifiProvider, setWifiProvider] = useState('');
  const [carrierSignals, setCarrierSignals] = useState(EMPTY_CARRIERS);
  // Section 4 declarations. `''` means the host has not declared the item yet,
  // which is deliberately different from "declared none".
  const [conditionRating, setConditionRating] = useState('');
  const [conditionDetails, setConditionDetails] = useState([]);
  const [floodBadge, setFloodBadge] = useState('');
  const [waterBadge, setWaterBadge] = useState('');
  const [powerBadge, setPowerBadge] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenitiesText, setCustomAmenitiesText] = useState('');
  const [curfewRule, setCurfewRule] = useState('');
  const [hasCurfew, setHasCurfew] = useState(true);
  const [isCurfewApprovalOpen, setIsCurfewApprovalOpen] = useState(false);

  // ── Pin → walking route ───────────────────────────────────────────────────
  // The pin handler applies a straight-line estimate instantly (so the form
  // never feels dead), then this asks the same-origin `/api/route` proxy for the
  // real street route. Debounced because a drag fires several events, and guarded
  // by a request id plus a manual-edit flag so a slow answer can never overwrite
  // a newer pin or a number the landlord typed.
  const requestWalkingRoute = (lat, lng) => {
    const requestId = routeRequestRef.current + 1;
    routeRequestRef.current = requestId;
    setRouteStatus('loading');
    setRouteInfo(null);

    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);

    routeTimerRef.current = setTimeout(async () => {
      const result = await getWalkingRoute({ from: { lat, lng }, to: CAMPUS });

      if (routeRequestRef.current !== requestId) return; // a newer pin took over
      if (pinManuallyEditedRef.current) {
        setRouteStatus('idle');
        return;
      }

      if (!result.ok) {
        setRouteStatus('failed');
        setPinMetricNote(`Street routing is unavailable right now (${result.error?.code || 'error'}), so the distance is the straight-line fallback. You can still edit it.`);
        return;
      }

      const routedMeters = normalizeDistanceMeters(result.distanceMeters);
      setDistanceMeters(String(routedMeters));
      setWalkingMinutes(String(estimateWalkMinutes(routedMeters)));
      setCommuteMinutes(String(estimateCommuteMinutes(routedMeters)));
      setDistanceSource('pin');
      setRouteStatus('routed');
      setRouteInfo({
        provider: result.provider,
        durationSeconds: result.durationSeconds,
        snappedFromMeters: result.snappedFromMeters,
        geometry: result.geometry,
        computedAt: new Date().toISOString()
      });

      if (result.distanceMeters > MAX_DISTANCE_METERS) {
        setPinMetricNote(`That pin is about ${formatDistance(result.distanceMeters)} from campus on foot, so the distance is capped at ${formatDistance(MAX_DISTANCE_METERS)}. Check the pin.`);
      } else if (result.snappedFromMeters > ROUTE_SNAP_WARNING_METERS) {
        setPinMetricNote(`Your pin is ${formatDistance(result.snappedFromMeters)} from the nearest mapped footpath, so the route starts from there. Move the pin onto the street for an exact number.`);
      } else {
        setPinMetricNote('');
      }
    }, ROUTE_DEBOUNCE_MS);
  };

  // Drop the pending route request when the editor closes.
  useEffect(() => () => {
    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
  }, []);

  // Populate fields on edit mode
  useEffect(() => {
    if (isEdit && property) {
      setName(property.name || '');
      setArea(property.area || '');
      setRoomType(property.roomType || 'Solo Pad / Private Room');
      setGender(property.gender || 'Co-ed Boarding House');
      setPrice(property.price ?? '');
      setPriceSubtext(property.priceSubtext || '/month');
      setAvailableCount(property.availableCount ?? 1);
      setAdvanceDeposit(property.advanceDeposit || '');
      setMinContract(property.minContract || '');
      
      const mainGate = property.gateProximities?.mainSFGate || {};
      const walk = mainGate.walkingMinutes;
      if (walk !== undefined && walk !== null) setWalkingMinutes(Number(walk) > 0 ? walk : '');
      const meters = mainGate.distanceMeters;
      if (meters !== undefined && meters !== null) setDistanceMeters(Number(meters) > 0 ? meters : '');
      // Rows saved before pin-derived distances existed carry no provenance flag,
      // so they are treated as manual: the landlord opts into the auto value.
      setDistanceSource(mainGate.distanceSource === 'pin' ? 'pin' : 'manual');
      setPinMetricNote('');

      // Restore the street route a previous save already calculated, so the map
      // shows the real path and saving again does not lose it.
      const storedRoute = mainGate.route;
      if (storedRoute && Array.isArray(storedRoute.geometry) && storedRoute.geometry.length > 1) {
        setRouteInfo({
          provider: storedRoute.provider || 'osrm-foot',
          durationSeconds: Number(storedRoute.durationSeconds) || 0,
          snappedFromMeters: Number(storedRoute.snappedFromMeters) || 0,
          geometry: storedRoute.geometry,
          computedAt: storedRoute.computedAt || null
        });
        setRouteStatus('routed');
      } else {
        setRouteInfo(null);
        setRouteStatus('idle');
      }
      pinManuallyEditedRef.current = false;
      setFeedMode(mainGate.feedMode === 'commute' ? 'commute' : 'walk');

      // The ride time is stored too. Pads saved before it existed fall back to
      // the distance-based estimate instead of opening the edit form empty.
      const ride = mainGate.commuteMinutes;
      const rideMeters = Number(meters) > 0
        ? Number(meters)
        : (Number(walk) > 0 ? Number(walk) * WALK_METERS_PER_MINUTE : 0);
      setCommuteMinutes(Number(ride) > 0
        ? ride
        : (rideMeters ? String(estimateCommuteMinutes(rideMeters)) : ''));

      if (property.latitude != null && property.longitude != null) {
        setLatitude(Number(property.latitude));
        setLongitude(Number(property.longitude));

        // A saved pin with no distance is exactly the case this feature fixes:
        // derive the numbers from the pin instead of asking the host to retype
        // them. Manual numbers already on the row are left untouched.
        if (!(Number(meters) > 0)) {
          const derivedMeters = normalizeDistanceMeters(
            distanceMetersBetween(
              { lat: Number(property.latitude), lng: Number(property.longitude) },
              CAMPUS
            )
          );
          setDistanceMeters(String(derivedMeters));
          setWalkingMinutes(String(estimateWalkMinutes(derivedMeters)));
          setCommuteMinutes(String(estimateCommuteMinutes(derivedMeters)));
          setDistanceSource('pin');
          // Upgrade that placeholder to the real street route right away.
          requestWalkingRoute(Number(property.latitude), Number(property.longitude));
        }
      } else {
        setLatitude('');
        setLongitude('');
      }

      if (Array.isArray(property.images) && property.images.length > 0) {
        setImageUrl(property.images[0]);
      }

      const rawWifi = property.wifiAudit || {};
      const rawWifiProvider = normalizeClaim(rawWifi.provider);
      const rawWifiSpeed = Number(rawWifi.downloadMbps);
      const isNoWifi = rawWifi.hasWifi === false ||
                       /^none/i.test(rawWifiProvider) ||
                       (!rawWifiProvider && rawWifiSpeed === 0);

      if (isNoWifi) {
        setWifiProvider('None (No Wi-Fi Provided)');
        setWifiSpeed(0);
      } else {
        setWifiSpeed(rawWifiSpeed > 0 ? rawWifiSpeed : '');
        setWifiProvider(rawWifiProvider);
      }

      const rawCarriers = rawWifi.carrierSignals && typeof rawWifi.carrierSignals === 'object'
        ? rawWifi.carrierSignals
        : {};
      setCarrierSignals({
        dito: normalizeClaim(rawCarriers.dito),
        smart: normalizeClaim(rawCarriers.smart),
        globe: normalizeClaim(rawCarriers.globe)
      });

      // Building condition — the checklist item that used to have no control
      // at all. Prefer the structured rating, then fall back to the status text
      // of rows saved before ratings existed.
      const rawCondition = property.buildingCondition || {};
      const savedConditionStatus = normalizeClaim(rawCondition.status);
      const savedConditionRating = normalizeClaim(rawCondition.rating).toLowerCase();
      const conditionOption =
        CONDITION_OPTIONS.find(option => option.value === savedConditionRating) ||
        CONDITION_OPTIONS.find(option => option.value &&
          option.status.toLowerCase() === savedConditionStatus.toLowerCase());

      const hasConditionClaim = Boolean(
        savedConditionStatus ||
        normalizeClaim(rawCondition.badge) ||
        normalizeClaim(rawCondition.description) ||
        rawCondition.isCertified === true
      );

      setConditionRating(
        conditionOption?.value ||
        (hasConditionClaim ? (/good|excellent|renovat|leak-free/i.test(savedConditionStatus) ? 'good' : 'fair') : '')
      );
      setConditionDetails(
        CONDITION_DETAILS
          .filter(detail => Boolean(normalizeClaim(rawCondition[detail.key])))
          .map(detail => detail.key)
      );

      // Flood / water / power — map the stored wording onto a known choice.
      // Legacy placeholders ("Not verified", "Host-declared") resolve to
      // "not declared" instead of being saved back as a feature.
      const rawFlood = property.floodRating || {};
      let floodOption = findOption(FLOOD_OPTIONS, rawFlood.badge) ||
                        findOption(FLOOD_OPTIONS, rawFlood.tagBadge);
      if (!floodOption && rawFlood.isFloodFree !== undefined) {
        floodOption = FLOOD_OPTIONS.find(option => option.value && option.isFloodFree === Boolean(rawFlood.isFloodFree)) || null;
      }
      setFloodBadge(floodOption?.value || normalizeClaim(rawFlood.badge));

      const rawWater = property.waterSystem || {};
      let waterOption = findOption(WATER_OPTIONS, rawWater.badge);
      if (!waterOption && (rawWater.hasReserveTank || rawWater.hasBoosterPump)) {
        waterOption = WATER_OPTIONS.find(option => option.value &&
          option.hasTank === Boolean(rawWater.hasReserveTank) &&
          option.hasBooster === Boolean(rawWater.hasBoosterPump)) || null;
      }
      setWaterBadge(waterOption?.value || normalizeClaim(rawWater.badge));

      const rawPower = property.powerSystem || {};
      let powerOption = findOption(POWER_OPTIONS, rawPower.badge);
      if (!powerOption && (rawPower.hasSolarBackup || rawPower.hasGenerator)) {
        powerOption = POWER_OPTIONS.find(option => option.value &&
          option.hasSolar === Boolean(rawPower.hasSolarBackup) &&
          option.hasGenerator === Boolean(rawPower.hasGenerator)) || null;
      }
      setPowerBadge(powerOption?.value || normalizeClaim(rawPower.badge));

      if (Array.isArray(property.amenities)) {
        setSelectedAmenities(property.amenities.map(a => typeof a === 'string' ? a : a.name).filter(Boolean));
      }

      setHasCurfew(padHasCurfew(property));

      const rules = Array.isArray(property.rules) ? property.rules : [];
      const noteEntry = rules.find((rule) => rule && (typeof rule === 'string'
        ? !/^no curfew$/i.test(rule)
        : rule.curfew !== false)) || rules[0];
      if (noteEntry) {
        setCurfewRule(typeof noteEntry === 'string' ? noteEntry : (noteEntry.desc || ''));
      } else {
        setCurfewRule('');
      }
    } else {
      // Blank new-listing values. Nothing is fabricated for the landlord.
      setName('');
      setArea('');
      setRoomType('Solo Pad / Private Room');
      setGender('Co-ed Boarding House');
      setPrice('');
      setAvailableCount(1);
      setWalkingMinutes('');
      setCommuteMinutes('');
      setDistanceMeters('');
      setDistanceSource('manual');
      setPinMetricNote('');
      setRouteInfo(null);
      setRouteStatus('idle');
      routeRequestRef.current += 1;
      pinManuallyEditedRef.current = false;
      setFeedMode('walk');
      setImageUrl('');
      setLatitude('');
      setLongitude('');
      setWifiSpeed('');
      setWifiProvider('');
      setCarrierSignals(EMPTY_CARRIERS);
      setConditionRating('');
      setConditionDetails([]);
      setFloodBadge('');
      setWaterBadge('');
      setPowerBadge('');
      setCurfewRule('');
      setHasCurfew(true);
    }
  }, [isEdit, property, isOpen]);

  // Jump straight to the pin picker when the editor is opened for location work.
  useEffect(() => {
    if (!isOpen || !focusLocation) return undefined;
    const timer = setTimeout(() => {
      locationSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen, focusLocation]);

  if (!isOpen) return null;

  const toggleAmenity = (name) => {
    setSelectedAmenities(prev => 
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  /**
   * The single place where a pin becomes a number.
   *
   * Dropping, dragging or GPS-locating the pin writes the exact coordinates,
   * applies the straight-line estimate instantly, and then asks the routing
   * proxy for the real walking route — which replaces the estimate a moment
   * later. The feed choice (walk vs commute) stays the landlord's, and typing
   * any of the three numbers overrides the auto value (`distanceSource`).
   */
  const applyPinLocation = (rawLat, rawLng) => {
    const lat = Number(Number(rawLat).toFixed(6));
    const lng = Number(Number(rawLng).toFixed(6));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setLatitude(lat);
    setLongitude(lng);
    setLocationError('');
    pinManuallyEditedRef.current = false;

    const straightLineMeters = distanceMetersBetween({ lat, lng }, CAMPUS);
    const derivedMeters = normalizeDistanceMeters(straightLineMeters);

    setDistanceMeters(String(derivedMeters));
    setWalkingMinutes(String(estimateWalkMinutes(derivedMeters)));
    setCommuteMinutes(String(estimateCommuteMinutes(derivedMeters)));
    setDistanceSource('pin');

    if (straightLineMeters > MAX_DISTANCE_METERS) {
      setPinMetricNote(`That pin is about ${formatDistance(straightLineMeters)} from campus, so the distance is capped at ${formatDistance(MAX_DISTANCE_METERS)}. Check the pin, or type the real distance if the location is right.`);
    } else if (straightLineMeters < MIN_DISTANCE_METERS) {
      setPinMetricNote(`That pin sits on campus itself. The app records at least ${MIN_DISTANCE_METERS} m so the distance stays meaningful.`);
    } else {
      setPinMetricNote('');
    }

    // Replace the estimate with the street route as soon as it arrives.
    requestWalkingRoute(lat, lng);
  };

  // Re-derive from the pin that is already dropped, without moving it. Used
  // after a landlord has typed a manual number and wants the auto value back.
  const handleRecalculateFromPin = () => {
    if (latitude === '' || longitude === '') return;
    applyPinLocation(latitude, longitude);
  };

  // One-tap pin: drop the landlord's exact spot from the device GPS.
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('This browser cannot read your device location. Tap the map instead.');
      return;
    }

    setIsLocating(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyPinLocation(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      (err) => {
        setLocationError(
          err?.code === 1
            ? 'Location permission was denied. Allow location access or tap the map to drop the pin.'
            : 'Could not read your location right now. Tap the map to drop the pin instead.'
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleAddCustomAmenitiesFromText = () => {
    if (!customAmenitiesText.trim()) return;
    const items = customAmenitiesText
      .split(/[,\n]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);

    setSelectedAmenities(prev => {
      const updated = [...prev];
      items.forEach(it => {
        if (!updated.includes(it)) {
          updated.push(it);
        }
      });
      return updated;
    });
    setCustomAmenitiesText('');
  };

  // Wi-Fi is three-state: not declared, declared ISP (with a measured speed),
  // or explicitly "no Wi-Fi". These helpers keep the form and the saved payload
  // reading the same values.
  const wifiSpeedValue = wifiSpeed === '' ? 0 : Number(wifiSpeed);
  const noWifiSelected = /none/i.test(wifiProvider);

  const toggleConditionDetail = (key) => {
    setConditionDetails(prev => (
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    ));
  };

  // Any typed value is an override: it must win over an in-flight route request
  // and stop the form claiming the number came from the pin.
  const markManualOverride = () => {
    pinManuallyEditedRef.current = true;
    setDistanceSource('manual');
    setRouteStatus((prev) => (prev === 'loading' ? 'idle' : prev));
  };

  // Walking minutes and distance are two ways of describing the same trip. The
  // form used to leave one at 0 when the host filled in the other, which made
  // the feed advertise "0 min walk" and the saved commute estimate 0. Typing
  // either value now keeps the other in sync.
  //
  // Typing always means an override: `distanceSource` flips to 'manual' so the
  // pin badge stops claiming the number and "Recalculate" appears.
  const handleWalkingMinutesChange = (e) => {
    const raw = e.target.value;
    setWalkingMinutes(raw);
    markManualOverride();
    const mins = Number(raw);
    if (Number.isFinite(mins) && mins > 0) {
      setDistanceMeters(String(Math.round(mins * WALK_METERS_PER_MINUTE)));
    }
  };

  const handleDistanceMetersChange = (e) => {
    const raw = e.target.value;
    setDistanceMeters(raw);
    markManualOverride();
    const meters = Number(raw);
    if (Number.isFinite(meters) && meters > 0) {
      setWalkingMinutes(String(estimateWalkMinutes(meters)));
      setCommuteMinutes(String(estimateCommuteMinutes(meters)));
    }
  };

  const handleCommuteMinutesChange = (e) => {
    setCommuteMinutes(e.target.value);
    markManualOverride();
  };

  // Switching the advertised mode must also switch the number the host edits,
  // so the form never keeps showing a walking time after "Commute" is picked.
  const handleFeedModeChange = (nextMode) => {
    setFeedMode(nextMode);
    if (nextMode === 'commute' && !Number(commuteMinutes)) {
      const meters = Number(distanceMeters) || (Number(walkingMinutes) ? Number(walkingMinutes) * WALK_METERS_PER_MINUTE : 0);
      if (meters > 0) setCommuteMinutes(String(estimateCommuteMinutes(meters)));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this pad / boarding house.');
      return;
    }

    setLoading(true);
    setError('');

    const getAmenityIcon = (amName) => {
      const lower = amName.toLowerCase();
      if (lower.includes('water') || lower.includes('shower') || lower.includes('tap')) return 'water';
      if (lower.includes('cctv') || lower.includes('security') || lower.includes('guard')) return 'cctv';
      if (lower.includes('lock') || lower.includes('biometric') || lower.includes('rfid') || lower.includes('keycard')) return 'lock';
      if (lower.includes('meter') || lower.includes('electric') || lower.includes('kwh')) return 'meter';
      if (lower.includes('fridge') || lower.includes('kitchen') || lower.includes('cook') || lower.includes('microwave') || lower.includes('induction')) return 'fridge';
      if (lower.includes('bed') || lower.includes('mattress') || lower.includes('bunk')) return 'bed';
      if (lower.includes('wifi') || lower.includes('fiber') || lower.includes('internet')) return 'wifi';
      return 'desk';
    };

    const formattedAmenities = selectedAmenities.map(am => ({
      name: am,
      icon: getAmenityIcon(am)
    }));

    // ── Section 4 declarations ─────────────────────────────────────────────
    // Each choice carries its own flags. "Not declared" (empty value) writes an
    // empty claim rather than a phrase like "Not verified" that the student
    // profile would render as if the host had answered.
    const carrierSignalValues = normalizeCarrierSignals(carrierSignals);
    const hasCarrierClaim = Object.keys(carrierSignalValues).length > 0;
    const wifiUndecided = !wifiProvider && !wifiSpeedValue && !hasCarrierClaim;

    const conditionChoice = CONDITION_OPTIONS.find(option => option.value === conditionRating) || null;
    const chosenDetails = CONDITION_DETAILS.filter(detail => conditionDetails.includes(detail.key));
    const detailClaim = (key) => chosenDetails.find(detail => detail.key === key)?.claim || '';

    const floodChoice = FLOOD_OPTIONS.find(option => option.value === floodBadge) || null;
    const waterChoice = WATER_OPTIONS.find(option => option.value === waterBadge) || null;
    const powerChoice = POWER_OPTIONS.find(option => option.value === powerBadge) || null;

    const typedWalkMins = Number(walkingMinutes) || 0;
    const typedRideMins = Number(commuteMinutes) || 0;
    const typedMeters = Number(distanceMeters) || 0;
    // Raw great-circle metres for the pin, kept next to the distance so a future
    // routed (street-following) value can be compared against it.
    const straightFromPinMeters = latitude !== '' && longitude !== ''
      ? distanceMetersBetween({ lat: Number(latitude), lng: Number(longitude) }, CAMPUS)
      : 0;
    // Either field alone is enough: derive the missing one so a pad can never be
    // saved with a 0-minute walk (or a 0-minute ride) just because the host only
    // filled in the other box.
    const gateMeters = typedMeters || (typedWalkMins ? typedWalkMins * WALK_METERS_PER_MINUTE : 0);
    const walkMins = typedWalkMins || estimateWalkMinutes(gateMeters);
    const commuteMins = typedRideMins || estimateCommuteMinutes(gateMeters);
    const feedDistanceText = feedMode === 'commute' && commuteMins > 0
      ? `${commuteMins} min ride`
      : `${walkMins} min walk`;

    const padPayload = {
      name: name.trim(),
      // Zone/subdivision is no longer a separate question: the first segment of
      // the typed address feeds the zone filters and the compact location line.
      zone: area.trim().split(',')[0].trim() || (isEdit ? (property?.zone || '').trim() : ''),
      area: area.trim(),
      shortLocation: `${area.trim().split(',')[0].trim() || (isEdit ? (property?.zone || '').trim() : '')} • ${feedDistanceText}`,
      roomType,
      gender,
      price: Number(price),
      priceSubtext,
      availableCount: Number(availableCount),
      statusTag: Number(availableCount) === 0 ? 'Fully Occupied' : `${availableCount} Room${Number(availableCount) === 1 ? '' : 's'} Available`,
      statusColor: Number(availableCount) === 0 ? 'orange' : 'green',
      advanceDeposit,
      minContract,
      images: imageUrl ? [imageUrl] : [],
      latitude: latitude === '' ? null : Number(latitude),
      longitude: longitude === '' ? null : Number(longitude),
      gateProximities: {
        ...(property?.gateProximities || {}),
        mainSFGate: {
          ...(property?.gateProximities?.mainSFGate || {}),
          walkingMinutes: walkMins,
          distanceMeters: gateMeters,
          commuteMinutes: commuteMins,
          feedMode,
          label: feedDistanceText,
          // Provenance: lets a later edit tell an auto-derived number from one
          // the landlord typed, and keeps the raw pin-to-campus line for audit.
          distanceSource: distanceSource === 'pin' ? 'pin' : 'manual',
          straightLineMeters: straightFromPinMeters > 0 ? Math.round(straightFromPinMeters) : null,
          // The real street route behind an auto distance. Dropped when the value
          // is manual or the straight-line fallback, so nothing can later mistake
          // a stale path for the number that was actually saved.
          route: distanceSource === 'pin' && routeStatus === 'routed' && Array.isArray(routeInfo?.geometry)
            ? {
                provider: routeInfo.provider || 'osrm-foot',
                distanceMeters: gateMeters,
                durationSeconds: Number(routeInfo.durationSeconds) || 0,
                snappedFromMeters: Number(routeInfo.snappedFromMeters) || 0,
                geometry: routeInfo.geometry,
                computedAt: routeInfo.computedAt || new Date().toISOString()
              }
            : null
        }
      },
      wifiAudit: wifiUndecided ? {} : {
        // Carrier signals share this object with Wi-Fi, so only write Wi-Fi
        // keys when the host actually made a Wi-Fi claim. Otherwise a pad with
        // SIM data but "Wi-Fi not declared" would look like "no Wi-Fi here".
        ...(wifiProvider || wifiSpeedValue > 0 ? {
          hasWifi: !noWifiSelected,
          downloadMbps: noWifiSelected ? 0 : wifiSpeedValue,
          uploadMbps: noWifiSelected ? 0 : Math.round(wifiSpeedValue * 0.5),
          provider: noWifiSelected ? 'None (No Wi-Fi Provided)' : wifiProvider,
          // Never erase an audit date the landlord is not being asked about here.
          verifiedDate: normalizeClaim(property?.wifiAudit?.verifiedDate),
          ratingBadge: noWifiSelected
            ? 'No Wi-Fi'
            : (wifiSpeedValue >= 60 ? 'Ultra Fast Fiber' : 'Fiber Ready (Fast)')
        } : {}),
        carrierSignals: carrierSignalValues
      },
      floodRating: floodChoice && floodChoice.value ? {
        isFloodFree: floodChoice.isFloodFree,
        badge: floodChoice.value,
        tagBadge: floodChoice.tagBadge || 'Host-declared',
        elevation: floodChoice.elevation || '',
        description: normalizeClaim(property?.floodRating?.description),
        history: normalizeClaim(property?.floodRating?.history)
      } : {},
      waterSystem: waterChoice && waterChoice.value ? {
        hasBoosterPump: waterChoice.hasBooster,
        hasReserveTank: waterChoice.hasTank,
        badge: waterChoice.value,
        tankCapacity: waterChoice.tankCapacity || '',
        description: normalizeClaim(property?.waterSystem?.description)
      } : {},
      powerSystem: powerChoice && powerChoice.value ? {
        hasSolarBackup: powerChoice.hasSolar,
        hasGenerator: powerChoice.hasGenerator,
        badge: powerChoice.value,
        description: normalizeClaim(property?.powerSystem?.description)
      } : {},
      amenities: formattedAmenities,
      rules: hasCurfew
        ? (curfewRule.trim()
            ? [{ title: 'Curfew & Gate Access', desc: curfewRule.trim(), curfew: true }]
            : [])
        : [{
            title: 'No Curfew',
            desc: curfewRule.trim() || '24/7 gate access — no curfew enforced.',
            curfew: false
          }],
      // Checklist item 1 — previously had no form control and was frozen at
      // "Pending audit" for every pad, which is why the profile showed a
      // verified pill above "Building condition has not been audited yet".
      buildingCondition: conditionChoice && conditionChoice.value ? {
        rating: conditionChoice.value,
        status: conditionChoice.status,
        badge: 'Host-declared',
        tagBadge: 'Host-declared',
        isCertified: false,
        roofCondition: detailClaim('roofCondition'),
        drainage: detailClaim('drainage'),
        ventilation: detailClaim('ventilation'),
        description: chosenDetails.map(detail => detail.claim).join(' • ')
      } : {},
      landlord: {
        name: user?.name || property?.landlord?.name || '',
        role: 'landlord',
        phone: user?.phone || property?.landlord?.phone || '',
        email: user?.email || property?.landlord?.email || '',
        userId: user?.id || property?.landlord?.userId || null,
        avatar: user?.avatar || property?.landlord?.avatar || '',
        experience: property?.landlord?.experience || ''
      }
    };

    try {
      let savedResult;
      if (isEdit) {
        savedResult = await api.updateProperty(property.id, padPayload);
      } else {
        savedResult = await api.createProperty(padPayload);
      }

      onSave?.(savedResult);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save boarding pad.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove "${property?.name}" from your listings?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.deleteProperty(property.id);
      onDelete?.(property.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to delete listing.');
    } finally {
      setLoading(false);
    }
  };

  // Live preview of the two numbers the student feed/profile will show.
  const previewWalkMinutes = Number(walkingMinutes) || 0;
  const previewMeters = Number(distanceMeters) || (previewWalkMinutes ? previewWalkMinutes * WALK_METERS_PER_MINUTE : 0);
  const previewWalk = previewWalkMinutes || estimateWalkMinutes(previewMeters);
  const previewCommute = Number(commuteMinutes) || estimateCommuteMinutes(previewMeters);
  const previewWalkLabel = previewWalk > 0 ? `${previewWalk} min walk` : 'walk time not set';
  const previewCommuteLabel = previewCommute > 0 ? `${previewCommute} min ride` : 'ride time not set';

  // Whether a pin exists at all, and what the form will actually save: the
  // routed metres once the router answered, otherwise the straight-line estimate.
  const hasPin = latitude !== '' && longitude !== '';
  const appliedDistanceLabel = formatDistance(distanceMeters) || `${MIN_DISTANCE_METERS} m`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92dvh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0b1a30] via-[#12284c] to-[#1a3a6b] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white leading-tight">
                {isEdit ? `Edit Pad — ${property.name}` : 'Publish New Boarding Pad'}
              </h3>
              <p className="text-xs text-blue-200">
                {isEdit ? 'Update room availability, rental price, or facilities' : 'Add your boarding house to Balay Urios FSUU Student Feed'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-bold">{error}</span>
            </div>
          )}

          {/* Section 1: General Pad Information */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-xs text-[#0b1a30] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>1. Basic Boarding Pad Details</span>
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Boarding House / Pad Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Your boarding house name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Room Configuration Type
              </label>
              <select
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="Solo Pad / Private Room">Solo Pad / Private Room</option>
                <option value="2-Bedspace Room">2-Bedspace Room</option>
                <option value="4-Bedspace Studio">4-Bedspace Studio</option>
                <option value="En-Suite Studio Pad">En-Suite Studio Pad</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Full Street Address & Barangay
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Guingona Subd., Brgy. JP Rizal, Butuan City"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Tenant Gender Policy
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="Co-ed Boarding House">Co-ed Boarding House (Male & Female Floors)</option>
                  <option value="Female Only">Female Only</option>
                  <option value="Male Only">Male Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Pricing, Vacancy & Deposit */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-xs text-[#0b1a30] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <span className="text-amber-500 font-black">₱</span>
              <span>2. Pricing, Deposit & Available Vacancies</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Monthly Rate (₱) *
                </label>
                <input
                  type="number"
                  min="500"
                  max="50000"
                  step="50"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Rate Unit
                </label>
                <select
                  value={priceSubtext}
                  onChange={(e) => setPriceSubtext(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="/month">/month (whole room)</option>
                  <option value="/bedspace">/bedspace</option>
                  <option value="/sem">/semester</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Available Vacant Rooms *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={availableCount}
                  onChange={(e) => setAvailableCount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-black text-emerald-700 text-xs focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Advance & Deposit Terms
                </label>
                <input
                  type="text"
                  value={advanceDeposit}
                  onChange={(e) => setAdvanceDeposit(e.target.value)}
                  placeholder="e.g. 1 Mo. Adv + 1 Mo. Dep"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Minimum Contract Period
                </label>
                <input
                  type="text"
                  value={minContract}
                  onChange={(e) => setMinContract(e.target.value)}
                  placeholder="e.g. Min. 5 Mos. (1 Sem)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Campus Proximity */}
          <div ref={locationSectionRef} className="space-y-3 pt-2 scroll-mt-2">
            <h4 className="font-extrabold text-xs text-[#0b1a30] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Footprints className="w-4 h-4 text-emerald-600" />
              <span>3. Distance to FSUU Campus</span>
            </h4>

            <p className="text-[10px] text-slate-500 leading-snug -mt-1">
              Drop your pin first — we measure the <b>walking route</b> from it to
              FSUU Main (following streets, not a straight line) and fill in the
              distance plus the walk/ride minutes. Type any number to override it,
              and pick below whether students see walking or commute time.
            </p>

            {/* Pin first: it is the source of every number in this section. */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label className="block text-[11px] font-bold text-slate-600">
                  Pin exact location on the map
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <MapPin className="w-3 h-3 text-blue-600" />
                    <span>{isLocating ? 'Locating...' : 'Use my current location'}</span>
                  </button>
                  {hasPin && (
                    <button
                      type="button"
                      onClick={() => {
                        setLatitude('');
                        setLongitude('');
                        setLocationError('');
                        setPinMetricNote('');
                        // The typed numbers stay, but they are no longer derived
                        // from a pin, so stop advertising them as auto values.
                        setDistanceSource('manual');
                        // Abandon any route that is still in flight.
                        routeRequestRef.current += 1;
                        pinManuallyEditedRef.current = true;
                        setRouteInfo(null);
                        setRouteStatus('idle');
                      }}
                      className="text-[10px] font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Clear pin
                    </button>
                  )}
                </div>
              </div>

              {locationError && (
                <p className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5 mb-1.5">
                  {locationError}
                </p>
              )}

              <div className="h-52 w-full rounded-2xl overflow-hidden border border-slate-200">
                <LocationPickerMap
                  value={hasPin ? { lat: Number(latitude), lng: Number(longitude) } : null}
                  onChange={({ lat, lng }) => applyPinLocation(lat, lng)}
                  route={routeInfo?.geometry || null}
                />
              </div>

              <div className="flex items-start justify-between gap-2 mt-1.5">
                <p className="text-[10px] text-slate-500 leading-snug">
                  {hasPin
                    ? routeStatus === 'loading' && distanceSource !== 'manual'
                      ? `Pinned at ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)} · calculating the walking route…`
                      : distanceSource === 'manual'
                        ? `Pinned at ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)} · ${appliedDistanceLabel} (your own number) to FSUU Main (${previewWalk} min walk / ${previewCommute} min ride). Drag the amber pin to fine-tune.`
                        : `Pinned at ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)} · ${appliedDistanceLabel} ${routeStatus === 'routed' ? 'walking route' : 'straight-line fallback'} to FSUU Main (${previewWalk} min walk / ${previewCommute} min ride). Drag the amber pin to fine-tune.`
                    : `Tap the map to drop your pin near ${CAMPUS.lat.toFixed(4)}, ${CAMPUS.lng.toFixed(4)} (FSUU Main). The walking route and the walk/ride minutes then fill in automatically.`}
                </p>
                {hasPin && (
                  distanceSource === 'manual' ? (
                    <button
                      type="button"
                      onClick={handleRecalculateFromPin}
                      title="Recalculate the walking route and minutes from this pin"
                      className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <MapPin className="w-3 h-3 text-amber-600" />
                      <span>Recalculate</span>
                    </button>
                  ) : routeStatus === 'loading' ? (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                      Routing…
                    </span>
                  ) : routeStatus === 'routed' ? (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Routed auto
                    </span>
                  ) : (
                    <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Auto from pin
                    </span>
                  )
                )}
              </div>

              {pinMetricNote && (
                <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 mt-1.5">
                  {pinMetricNote}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {feedMode === 'commute' ? 'Commute Minutes to Main Gate' : 'Walking Minutes to Main Gate'}
                </label>
                {/* Guard rail wide enough for any pin the distance field
                    accepts (10 km ≈ 133 min walk), so a derived value is
                    never rejected by validation. */}
                {feedMode === 'commute' ? (
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={commuteMinutes}
                    onChange={handleCommuteMinutesChange}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                    required
                  />
                ) : (
                  <input
                    type="number"
                    min="1"
                    max="300"
                    value={walkingMinutes}
                    onChange={handleWalkingMinutesChange}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                    required
                  />
                )}
                <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-snug">
                  {feedMode === 'commute'
                    ? `Pad profile walk time: ${previewWalk > 0 ? `${previewWalk} min walk` : 'not set'} · 75 m per minute`
                    : `Pad profile ride time: ${previewCommute > 0 ? `${previewCommute} min ride` : 'not set'} · estimated trike/jeepney trip + wait`}
                </p>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Distance in Meters
                </label>
                <input
                  type="number"
                  min={MIN_DISTANCE_METERS}
                  max={MAX_DISTANCE_METERS}
                  step="1"
                  value={distanceMeters}
                  onChange={handleDistanceMetersChange}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                  required
                />
                <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-snug">
                  {hasPin && distanceSource === 'pin'
                    ? routeStatus === 'loading'
                      ? 'Calculating the walking route from your pin…'
                      : routeStatus === 'routed'
                        ? `Auto: ${appliedDistanceLabel} walking route from your pin — it follows streets, not a straight line. Type a number to override.`
                        : `Auto: ${appliedDistanceLabel} straight-line fallback. Type a number to override.`
                    : hasPin
                      ? 'Manual value. Moving the pin recalculates it — or press “Recalculate” to apply the pin value now.'
                      : 'Drop a pin above to calculate this automatically, or type a measured distance.'}
                </p>
              </div>
            </div>

            {/* Feed distance preference: walk vs commute (profile shows both) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Distance shown in the student feed *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFeedModeChange('walk')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    feedMode === 'walk'
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Walk minutes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedModeChange('commute')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    feedMode === 'commute'
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" />
                  <span>Commute minutes</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                {feedMode === 'commute'
                  ? (previewCommute > 0
                      ? `Feed shows “${previewCommute} min ride” — estimated tricycle/jeepney trip plus waiting time.`
                      : 'Add walking minutes or a distance to estimate the ride time shown in the feed.')
                  : (previewWalk > 0
                      ? `Feed shows “${previewWalk} min walk”.`
                      : 'Add walking minutes or a distance to show walk time in the feed.')}
                {' '}The pad profile always lists both ({previewWalkLabel} · {previewCommuteLabel}), and distances switch to kilometres (e.g. {formatDistance(previewMeters) || '1.00 km'}) from 1 km up.
              </p>
            </div>
          </div>

          {/* Section 4: Student Reality Features */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-xs text-[#0b1a30] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>4. Student Reality Audit (Structure, Flood, Water, Wi-Fi & SIM)</span>
            </h4>

            <p className="text-[10px] text-slate-500 leading-snug -mt-1">
              These answers appear on your listing as <b>host-declared</b> claims until an FSUU auditor
              inspects the pad. Leave a field on <b>“Not declared yet”</b> if you would rather not claim it.
            </p>

            {/* 4.1 Good Condition (Rain or Shine) — checklist item 1 */}
            <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <CloudSun className="w-3.5 h-3.5 text-amber-600" /> Building Condition (Rain or Shine)
                </label>
                <select
                  value={conditionRating}
                  onChange={(e) => setConditionRating(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-amber-200 font-bold text-slate-800 text-xs"
                >
                  {CONDITION_OPTIONS.map(option => (
                    <option key={option.value || 'undeclared'} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {conditionRating ? (
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-amber-800 mb-1">
                    What holds up?
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {CONDITION_DETAILS.map(detail => {
                      const checked = conditionDetails.includes(detail.key);
                      return (
                        <button
                          key={detail.key}
                          type="button"
                          onClick={() => toggleConditionDetail(detail.key)}
                          aria-pressed={checked}
                          className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                            checked
                              ? 'bg-white text-amber-950 border-amber-400 shadow-2xs'
                              : 'bg-white/60 text-slate-500 border-amber-200 hover:bg-white'
                          }`}
                        >
                          <Check className={`w-3 h-3 ${checked ? 'text-emerald-600' : 'text-slate-300'}`} />
                          <span>{detail.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-amber-800/80 font-medium">
                  Students will see “Condition not declared” on your pad instead of a rain-or-shine claim.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Flood Safety
                </label>
                <select
                  value={floodBadge}
                  onChange={(e) => setFloodBadge(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                >
                  {FLOOD_OPTIONS.map(option => (
                    <option key={option.value || 'undeclared'} value={option.value}>{option.label}</option>
                  ))}
                  {floodBadge && !FLOOD_OPTIONS.some(option => option.value === floodBadge) && (
                    <option value={floodBadge}>{floodBadge} (saved)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-600" /> Water System
                </label>
                <select
                  value={waterBadge}
                  onChange={(e) => setWaterBadge(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                >
                  {WATER_OPTIONS.map(option => (
                    <option key={option.value || 'undeclared'} value={option.value}>{option.label}</option>
                  ))}
                  {waterBadge && !WATER_OPTIONS.some(option => option.value === waterBadge) && (
                    <option value={waterBadge}>{waterBadge} (saved)</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Blackout Resilience
                </label>
                <select
                  value={powerBadge}
                  onChange={(e) => setPowerBadge(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                >
                  {POWER_OPTIONS.map(option => (
                    <option key={option.value || 'undeclared'} value={option.value}>{option.label}</option>
                  ))}
                  {powerBadge && !POWER_OPTIONS.some(option => option.value === powerBadge) && (
                    <option value={powerBadge}>{powerBadge} (saved)</option>
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Wi-Fi ISP Provider
                </label>
                <select
                  value={wifiProvider}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWifiProvider(val);
                    if (/none/i.test(val)) {
                      setWifiSpeed(0);
                    } else if (!val) {
                      setWifiSpeed('');
                    } else if (!wifiSpeedValue) {
                      setWifiSpeed(50);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                >
                  <option value="">Not declared yet</option>
                  <option value="PLDT Home Fiber">PLDT Home Fiber</option>
                  <option value="Converge FiberX">Converge FiberX</option>
                  <option value="Globe At Home">Globe At Home</option>
                  <option value="DITO 5G Home WiFi">DITO 5G Home WiFi</option>
                  <option value="None (No Wi-Fi Provided)">None (No Wi-Fi Provided)</option>
                  {wifiProvider &&
                    !['PLDT Home Fiber', 'Converge FiberX', 'Globe At Home', 'DITO 5G Home WiFi', 'None (No Wi-Fi Provided)', 'None (No Wi-Fi)']
                      .includes(wifiProvider) && (
                      <option value={wifiProvider}>{wifiProvider} (saved)</option>
                    )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-indigo-600" /> Wi-Fi Download Speed (Mbps)
                  </span>
                  {(noWifiSelected) && (
                    <span className="text-[10px] text-amber-600 font-black uppercase tracking-wider">Set to None</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  disabled={noWifiSelected}
                  value={noWifiSelected ? 0 : wifiSpeed}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWifiSpeed(val);
                    if (val === 0) {
                      setWifiProvider('None (No Wi-Fi Provided)');
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    noWifiSelected
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {noWifiSelected ? (
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    ✓ Wi-Fi set to None. Listing will inform students to rely on mobile cellular data.
                  </p>
                ) : !wifiProvider && !wifiSpeedValue ? (
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    Not declared yet — students will see “Wi-Fi not declared” instead of a speed claim.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Signal className="w-3 h-3 text-purple-600" /> In-Room SIM Signal (per provider)
              </label>
              <p className="text-[10px] text-slate-500 font-medium mb-2">
                Optional. What a student's mobile data gets inside the room — leave “Not measured” if you have not tested it.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CARRIER_FIELDS.map(({ key, label, accent }) => {
                  const saved = carrierSignals[key];
                  const known = CARRIER_OPTIONS.some(option => option.value === saved);
                  return (
                    <div key={key}>
                      <label className={`block text-[10px] font-black uppercase tracking-wide mb-1 ${accent}`}>
                        {label}
                      </label>
                      <select
                        value={saved}
                        onChange={(e) => setCarrierSignals(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-2 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-[11px]"
                      >
                        {CARRIER_OPTIONS.map(option => (
                          <option key={option.value || 'undecided'} value={option.value}>{option.label}</option>
                        ))}
                        {saved && !known && <option value={saved}>{saved} (saved)</option>}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 5: Photos & Cover Image */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-xs text-[#0b1a30] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <ImageIcon className="w-4 h-4 text-pink-600" />
              <span>5. Pad Photos & Showcase Cover</span>
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Primary Photo Image URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700"
                required
              />
            </div>

            {/* Preset Image Swatches */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                Or pick a sample photo (optional):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PRESET_IMAGES.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => setImageUrl(preset.url)}
                    className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      imageUrl === preset.url ? 'border-blue-600 ring-2 ring-blue-500/30' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-16 object-cover"
                    />
                    <div className="p-1 bg-black/60 text-white text-[9px] truncate text-center font-semibold">
                      {preset.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 6: Included Amenities */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="font-extrabold text-xs text-[#0b1a30] uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>6. Included Amenities & Facilities</span>
              </h4>
              <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {selectedAmenities.length} selected
              </span>
            </div>

            {/* Standard Checklist Toggles */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 mb-1.5">Common FSUU Student Amenities:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMMON_AMENITIES.map((am) => {
                  const checked = selectedAmenities.includes(am);
                  return (
                    <div
                      key={am}
                      onClick={() => toggleAmenity(am)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center gap-2 select-none transition-all ${
                        checked 
                          ? 'bg-blue-50 border-blue-300 text-blue-950 font-bold shadow-2xs' 
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="accent-[#0b1a30] w-3.5 h-3.5 rounded"
                      />
                      <span className="truncate">{am}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Text Div for Landlord Included Amenities */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>✍️ Custom Included Amenities Text Box</span>
                </label>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Type or paste items (comma or newline separated)
                </span>
              </div>

              <textarea
                rows={2}
                value={customAmenitiesText}
                onChange={(e) => setCustomAmenitiesText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAddCustomAmenitiesFromText();
                  }
                }}
                placeholder="e.g. Hot & Cold Shower, Rooftop Study Deck, Induction Cooker Station, Private Clothesline, Personal Sink..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
              />

              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-500">Suggestions:</span>
                  {[
                    'Private In-Room T&B',
                    'Hot & Cold Shower',
                    'Microwave Oven',
                    'Shared Induction Cooktop',
                    'Rooftop Clothes Drying Deck',
                    'Individual Steel Locker'
                  ].map(sug => {
                    if (selectedAmenities.includes(sug)) return null;
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setSelectedAmenities(prev => [...prev, sug])}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-2.5 h-2.5 text-blue-600" />
                        {sug}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomAmenitiesFromText}
                  disabled={!customAmenitiesText.trim()}
                  className="ml-auto px-3.5 py-1.5 rounded-xl bg-[#0b1a30] hover:bg-[#1a3a6b] disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Custom Amenities</span>
                </button>
              </div>
            </div>

            {/* Active Included Amenities Summary Div */}
            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-[#0b1a30] flex items-center gap-1.5">
                  <span>Current Included Amenities for this Listing</span>
                  <span className="text-[10px] font-bold bg-white text-blue-900 px-2 py-0.5 rounded-full border border-blue-200">
                    {selectedAmenities.length} total
                  </span>
                </span>
                {selectedAmenities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedAmenities([])}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>
              
              {selectedAmenities.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No amenities selected yet. Check items above or type custom amenities.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedAmenities.map(am => (
                    <span
                      key={am}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white text-slate-800 text-xs font-bold border border-blue-200 shadow-2xs group"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span>{am}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedAmenities(prev => prev.filter(x => x !== am))}
                        className="text-slate-400 hover:text-red-600 transition-colors p-0.5 ml-0.5 rounded-md hover:bg-red-50 cursor-pointer"
                        title={`Remove ${am}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 7: House Rules & Optional Curfew */}
          <div className="space-y-2 pt-2">
            <label className="block text-[11px] font-bold text-slate-700">
              Gate Curfew Policy *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setHasCurfew(true)}
                aria-pressed={hasCurfew}
                className={`px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  hasCurfew
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300/50'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5 font-extrabold text-[11px] text-slate-800">
                  <Clock className={`w-3.5 h-3.5 ${hasCurfew ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>With curfew</span>
                </span>
                <span className="block text-[10.5px] text-slate-500 font-medium mt-0.5">
                  Gate locks at night. Digital curfew passes are available.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setHasCurfew(false)}
                aria-pressed={!hasCurfew}
                className={`px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                  !hasCurfew
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/50'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-1.5 font-extrabold text-[11px] text-slate-800">
                  <Clock className={`w-3.5 h-3.5 ${!hasCurfew ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>No curfew</span>
                </span>
                <span className="block text-[10.5px] text-slate-500 font-medium mt-0.5">
                  24/7 gate access. No curfew passes needed.
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="block text-[11px] font-bold text-slate-700">
                {hasCurfew ? 'Curfew & House Rules Note' : 'House Rules Note'}
              </label>
              {hasCurfew && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Gate Pass Supported
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={curfewRule}
              onChange={(e) => setCurfewRule(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              placeholder={hasCurfew
                ? 'e.g. Gate closes at 10:00 PM. Digital curfew slip accepted for clinical / lab duties.'
                : 'e.g. No smoking indoors. Quiet hours after 11:00 PM. Gate is open 24/7.'}
            />

            {hasCurfew ? (
              /* Landlord Curfew Exemption Pass Manager Div */
              <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-amber-950 block">Digital Curfew Exemption Passes</span>
                    <span className="text-[11px] text-amber-800">
                      Students submit digital gate passes for hospital shifts. You can verify and approve them directly from your landlord hub.
                    </span>
                  </div>
                </div>
                {property?.id && (
                  <button
                    type="button"
                    onClick={() => setIsCurfewApprovalOpen(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white text-[11px] font-bold shrink-0 transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Review Passes</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex items-start gap-2 text-xs">
                <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-emerald-950 block">No curfew — curfew passes are switched off</span>
                  <span className="text-[11px] text-emerald-800">
                    This pad has 24/7 gate access, so boarders will not see the digital curfew pass feature.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {isEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Pad</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#0b1a30] hover:bg-[#1a3a6b] disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isEdit ? <Check className="w-4 h-4 text-emerald-400" /> : <Plus className="w-4 h-4 text-amber-400" />}
                <span>{loading ? 'Saving Pad...' : (isEdit ? 'Save Changes' : 'Publish Pad Listing')}</span>
              </button>
            </div>
          </div>

        </form>
      </div>

      {/* Curfew Approval Modal from inside Edit Pad */}
      {property && (
        <CurfewApprovalModal
          isOpen={isCurfewApprovalOpen}
          property={property}
          onClose={() => setIsCurfewApprovalOpen(false)}
        />
      )}
    </div>
  );
}
