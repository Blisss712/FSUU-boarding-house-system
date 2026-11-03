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
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import CurfewApprovalModal from './CurfewApprovalModal';
import { LocationPickerMap } from './PropertyMap';
import { padHasCurfew } from '../utils/curfew';
import { estimateCommuteMinutes, formatDistance } from '../utils/distance';
import { CAMPUS } from '../lib/mapConfig';

const PRESET_IMAGES = [
  { label: 'Clean Solo Room with Study Desk', url: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80' },
  { label: 'Modern Studio with Balcony', url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80' },
  { label: 'Spacious Bedspace with Locker', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80' },
  { label: 'Cozy En-Suite Student Pad', url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80' },
  { label: 'Peaceful Boarding House Hallway', url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=600&q=80' }
];

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
  const [distanceMeters, setDistanceMeters] = useState('');
  // What the student feed advertises: walking minutes or commute minutes.
  const [feedMode, setFeedMode] = useState('walk');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [wifiSpeed, setWifiSpeed] = useState('');
  const [wifiProvider, setWifiProvider] = useState('None (No Wi-Fi Provided)');
  const [floodBadge, setFloodBadge] = useState('Not verified');
  const [waterBadge, setWaterBadge] = useState('Not verified');
  const [powerBadge, setPowerBadge] = useState('Not verified');
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [customAmenitiesText, setCustomAmenitiesText] = useState('');
  const [curfewRule, setCurfewRule] = useState('');
  const [hasCurfew, setHasCurfew] = useState(true);
  const [isCurfewApprovalOpen, setIsCurfewApprovalOpen] = useState(false);

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
      
      const walk = property.gateProximities?.mainSFGate?.walkingMinutes;
      if (walk !== undefined) setWalkingMinutes(walk);
      const meters = property.gateProximities?.mainSFGate?.distanceMeters;
      if (meters !== undefined) setDistanceMeters(meters);
      setFeedMode(property.gateProximities?.mainSFGate?.feedMode === 'commute' ? 'commute' : 'walk');

      if (property.latitude != null && property.longitude != null) {
        setLatitude(Number(property.latitude));
        setLongitude(Number(property.longitude));
      } else {
        setLatitude('');
        setLongitude('');
      }

      if (Array.isArray(property.images) && property.images.length > 0) {
        setImageUrl(property.images[0]);
      }

      const rawWifi = property.wifiAudit || {};
      const isNoWifi = rawWifi.hasWifi === false || 
                       rawWifi.provider?.toLowerCase().includes('none') || 
                       (rawWifi.downloadMbps !== undefined && Number(rawWifi.downloadMbps) === 0);

      if (isNoWifi) {
        setWifiProvider('None (No Wi-Fi Provided)');
        setWifiSpeed(0);
      } else {
        setWifiSpeed(Number(rawWifi.downloadMbps) || '');
        setWifiProvider(rawWifi.provider || '');
      }

      if (property.floodRating?.badge) setFloodBadge(property.floodRating.badge);
      if (property.waterSystem?.badge) setWaterBadge(property.waterSystem.badge);
      if (property.powerSystem?.badge) setPowerBadge(property.powerSystem.badge);

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
      setImageUrl('');
      setLatitude('');
      setLongitude('');
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
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
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

    const isNoneWifi = wifiProvider.toLowerCase().includes('none') || Number(wifiSpeed) === 0;
    const isNoneFlood = floodBadge.toLowerCase().includes('none') || floodBadge.toLowerCase().includes('prone');
    const isNoneWater = waterBadge.toLowerCase().includes('none') || waterBadge.toLowerCase().includes('direct tap');
    const isNonePower = powerBadge.toLowerCase().includes('none') || powerBadge.toLowerCase().includes('no backup') || powerBadge.toLowerCase().includes('no generator');

    const walkMins = Number(walkingMinutes) || 0;
    const gateMeters = Number(distanceMeters) || 0;
    const commuteMins = estimateCommuteMinutes(gateMeters);
    const feedDistanceText = feedMode === 'commute'
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
          label: feedDistanceText
        }
      },
      wifiAudit: {
        hasWifi: !isNoneWifi,
        downloadMbps: isNoneWifi ? 0 : Number(wifiSpeed),
        uploadMbps: isNoneWifi ? 0 : Math.round(Number(wifiSpeed) * 0.5),
        provider: isNoneWifi ? 'None (No Wi-Fi Provided)' : wifiProvider,
        verifiedDate: '',
        ratingBadge: isNoneWifi ? 'No Wi-Fi' : (Number(wifiSpeed) >= 60 ? 'Ultra Fast Fiber' : 'Fiber Ready (Fast)'),
        carrierSignals: {}
      },
      floodRating: {
        isFloodFree: isNoneFlood ? false : undefined,
        badge: floodBadge,
        tagBadge: isNoneFlood ? 'Flood Watch Zone' : 'Host-declared',
        description: 'Host-declared flood information. Pending independent audit.',
        history: ''
      },
      waterSystem: {
        hasBoosterPump: !isNoneWater && waterBadge.toLowerCase().includes('pump'),
        hasReserveTank: !isNoneWater && !waterBadge.toLowerCase().includes('direct tap'),
        badge: waterBadge,
        description: 'Host-declared water system information. Pending independent audit.',
        tankCapacity: ''
      },
      powerSystem: {
        hasSolarBackup: !isNonePower && powerBadge.toLowerCase().includes('solar'),
        hasGenerator: !isNonePower && powerBadge.toLowerCase().includes('generator'),
        badge: powerBadge,
        description: 'Host-declared backup power information. Pending independent audit.'
      },
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
      buildingCondition: property?.buildingCondition || {
        status: 'Pending audit',
        badge: 'Not yet audited',
        tagBadge: 'Host-declared',
        isCertified: false,
        description: 'Building condition has not been audited yet.'
      },
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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Walking Minutes to Main Gate
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={walkingMinutes}
                  onChange={(e) => setWalkingMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Distance in Meters
                </label>
                <input
                  type="number"
                  min="20"
                  max="10000"
                  step="10"
                  value={distanceMeters}
                  onChange={(e) => setDistanceMeters(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                  required
                />
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
                  onClick={() => setFeedMode('walk')}
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
                  onClick={() => setFeedMode('commute')}
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
                  ? `Feed shows “${estimateCommuteMinutes(Number(distanceMeters)) || 0} min ride” — estimated tricycle/jeepney trip plus waiting time.`
                  : `Feed shows “${Number(walkingMinutes) || 0} min walk”.`}
                {' '}The pad profile always lists both walk and commute time, and distances switch to kilometres (e.g. {formatDistance(Number(distanceMeters)) || '1.00 km'}) from 1 km up.
              </p>
            </div>

            {/* Exact map pin */}
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
                  {(latitude !== '' || longitude !== '') && (
                    <button
                      type="button"
                      onClick={() => {
                        setLatitude('');
                        setLongitude('');
                        setLocationError('');
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
                  value={
                    latitude !== '' && longitude !== ''
                      ? { lat: Number(latitude), lng: Number(longitude) }
                      : null
                  }
                  onChange={({ lat, lng }) => {
                    setLatitude(Number(lat.toFixed(6)));
                    setLongitude(Number(lng.toFixed(6)));
                  }}
                />
              </div>

              <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                {latitude !== '' && longitude !== ''
                  ? `Pinned at ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)} — drag the amber pin to fine-tune.`
                  : `Tap the map to drop your pin near ${CAMPUS.lat.toFixed(4)}, ${CAMPUS.lng.toFixed(4)} (FSUU Main). Students will see this exact spot on the public map.`}
              </p>
            </div>
          </div>

          {/* Section 4: Student Reality Features */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-xs text-[#0b1a30] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>4. Student Reality Audit (Flood, Water & Wi-Fi)</span>
            </h4>

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
                  <option value="Flood-Safe Zone (+2.4m Elevation)">Flood-Safe (+2.4m Elevation)</option>
                  <option value="Zero Recorded Monsoon Flooding">Zero Recorded Flooding</option>
                  <option value="Second Floor Living Quarters">Second Floor Quarters</option>
                  <option value="None (Flood-Prone / Ground Level)">None (Flood-Prone / Ground Level)</option>
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
                  <option value="24/7 Stainless Tank & Auto Pump">24/7 Stainless Tank & Pump</option>
                  <option value="Overhead Tank + Deep Well Backup">Tank + Deep Well Backup</option>
                  <option value="City Water with Ground Cistern">City Water with Cistern</option>
                  <option value="None (Direct City Tap Only)">None (Direct City Tap Only)</option>
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
                  <option value="Solar Emergency Lighting & Backups">Solar Emergency Lighting</option>
                  <option value="Generator-Supported Common Areas">Generator Ready</option>
                  <option value="Rechargeable LED Desk Stations">Rechargeable LED Stations</option>
                  <option value="None (No Generator or Backup Power)">None (No Backup Power)</option>
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
                    if (val === 'None (No Wi-Fi Provided)' || val === 'None (No Wi-Fi)') {
                      setWifiSpeed(0);
                    } else if (wifiSpeed === 0) {
                      setWifiSpeed(50);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs"
                >
                  <option value="PLDT Home Fiber">PLDT Home Fiber</option>
                  <option value="Converge FiberX">Converge FiberX</option>
                  <option value="Globe At Home">Globe At Home</option>
                  <option value="DITO 5G Home WiFi">DITO 5G Home WiFi</option>
                  <option value="None (No Wi-Fi Provided)">None (No Wi-Fi Provided)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-indigo-600" /> Wi-Fi Download Speed (Mbps)
                  </span>
                  {(wifiProvider.toLowerCase().includes('none') || wifiSpeed === 0) && (
                    <span className="text-[10px] text-amber-600 font-black uppercase tracking-wider">Set to None</span>
                  )}
                </label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  disabled={wifiProvider.toLowerCase().includes('none')}
                  value={wifiProvider.toLowerCase().includes('none') ? 0 : wifiSpeed}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWifiSpeed(val);
                    if (val === 0) {
                      setWifiProvider('None (No Wi-Fi Provided)');
                    }
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition-colors ${
                    wifiProvider.toLowerCase().includes('none')
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
                {wifiProvider.toLowerCase().includes('none') ? (
                  <p className="text-[10px] text-slate-500 font-medium mt-1">
                    ✓ Wi-Fi set to None. Listing will inform students to rely on mobile cellular data.
                  </p>
                ) : null}
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
