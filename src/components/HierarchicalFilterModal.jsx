import React from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Footprints, 
  CloudSun,
  ShieldCheck, 
  Droplets, 
  Zap, 
  Signal, 
  Wifi, 
  RotateCcw, 
  MapPin,
  Check,
  Plus,
  Search,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function HierarchicalFilterModal({
  selectedZone,
  setSelectedZone,
  zones: propZones,
  maxBudget,
  setMaxBudget,
  selectedRoomType = 'All',
  setSelectedRoomType,
  genderFilter = 'All',
  setGenderFilter,
  // 6 Checklist Filters
  rainOrShineOnly = false,
  setRainOrShineOnly,
  maxWalkMinutes,
  setMaxWalkMinutes,
  minWalkMinutes,
  setMinWalkMinutes,
  maxDistanceMeters,
  setMaxDistanceMeters,
  minDistanceMeters,
  setMinDistanceMeters,
  floodFreeOnly,
  setFloodFreeOnly,
  boosterPumpOnly,
  setBoosterPumpOnly,
  powerBackupOnly,
  setPowerBackupOnly,
  mobile5GOnly,
  setMobile5GOnly,
  mobileProvider,
  setMobileProvider,
  fastWifiOnly,
  setFastWifiOnly,
  minWifiSpeed,
  setMinWifiSpeed,
  selectedAmenities = [],
  setSelectedAmenities,
  availableAmenities = [],
  matchingCount,
  onResetFilters,
  onClose
}) {
  const [zonesList, setZonesList] = React.useState(propZones || ['All Zones']);
  const [amenityQuery, setAmenityQuery] = React.useState('');

  const [isCustomDistance, setIsCustomDistance] = React.useState(
    Boolean((maxDistanceMeters > 0) || (minDistanceMeters > 0))
  );

  const [customDistanceInput, setCustomDistanceInput] = React.useState(() => {
    if (minDistanceMeters > 0 && maxDistanceMeters > 0) return `${minDistanceMeters}m-${maxDistanceMeters}m`;
    if (maxDistanceMeters > 0) return `${maxDistanceMeters}m`;
    return '';
  });

  const handleCustomDistanceChange = (raw) => {
    setCustomDistanceInput(raw);
    const cleaned = raw.trim().toLowerCase();
    if (!cleaned) {
      if (setMaxDistanceMeters) setMaxDistanceMeters(0);
      if (setMinDistanceMeters) setMinDistanceMeters(0);
      return;
    }

    const toMeters = (str) => {
      str = str.trim();
      if (str.includes('km')) {
        const num = parseFloat(str.replace(/[^0-9.]/g, ''));
        return !isNaN(num) ? Math.round(num * 1000) : 0;
      }
      const num = parseInt(str.replace(/[^0-9]/g, ''), 10);
      return !isNaN(num) ? num : 0;
    };

    // Range format: e.g. "200-500", "200m - 500m", "0.2km - 0.6km", "200 to 500"
    const rangeMatch = cleaned.match(/^([0-9.]+\s*(?:km|m)?)\s*(?:-|to)\s*([0-9.]+\s*(?:km|m)?)$/);
    if (rangeMatch) {
      const min = toMeters(rangeMatch[1]);
      const max = toMeters(rangeMatch[2]);
      if (min > 0 || max > 0) {
        if (setMinDistanceMeters) setMinDistanceMeters(Math.min(min, max));
        if (setMaxDistanceMeters) setMaxDistanceMeters(Math.max(min, max));
        setMaxWalkMinutes(0);
        if (setMinWalkMinutes) setMinWalkMinutes(0);
        return;
      }
    }

    // Single number / distance: e.g. "300", "300m", "0.5km"
    const single = toMeters(cleaned);
    if (single > 0) {
      if (setMinDistanceMeters) setMinDistanceMeters(0);
      if (setMaxDistanceMeters) setMaxDistanceMeters(single);
      setMaxWalkMinutes(0);
      if (setMinWalkMinutes) setMinWalkMinutes(0);
      return;
    }

    if (setMaxDistanceMeters) setMaxDistanceMeters(0);
    if (setMinDistanceMeters) setMinDistanceMeters(0);
  };

  const handleResetAll = () => {
    setIsCustomDistance(false);
    setCustomDistanceInput('');
    setAmenityQuery('');
    if (setMaxDistanceMeters) setMaxDistanceMeters(0);
    if (setMinDistanceMeters) setMinDistanceMeters(0);
    if (setMinWalkMinutes) setMinWalkMinutes(0);
    if (setSelectedAmenities) setSelectedAmenities([]);
    if (setSelectedRoomType) setSelectedRoomType('All');
    if (setGenderFilter) setGenderFilter('All');
    onResetFilters();
  };

  const toggleAmenity = (name) => {
    if (!setSelectedAmenities) return;
    setSelectedAmenities(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    );
  };

  const allAmenitiesList = React.useMemo(() => {
    const list = [...(availableAmenities || [])];
    selectedAmenities.forEach(am => {
      if (!list.includes(am)) list.unshift(am);
    });
    return list;
  }, [availableAmenities, selectedAmenities]);

  const filteredAmenities = React.useMemo(() => {
    if (!amenityQuery.trim()) return allAmenitiesList;
    const q = amenityQuery.trim().toLowerCase();
    return allAmenitiesList.filter(am => am.toLowerCase().includes(q));
  }, [allAmenitiesList, amenityQuery]);

  React.useEffect(() => {
    if (!propZones || propZones.length <= 1) {
      api.getZones().then(z => {
        if (Array.isArray(z) && z.length > 0) setZonesList(z);
      });
    } else {
      setZonesList(propZones);
    }
  }, [propZones]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#0b1a30] text-amber-400 flex items-center justify-center font-bold shadow-xs">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-base text-[#0b1a30]">
                Student Reality Checklist Filters
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Verify walking distance, flood safety, water, power, carrier signal & Wi-Fi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST ITEM 1: BUILDING CONDITION (RAIN OR SHINE)    */}
        {/* ======================================================== */}
        <div className="space-y-2 p-3 rounded-2xl bg-amber-50/50 border border-amber-200/80">
          <label className="text-xs font-black text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-950">
              <CloudSun className="w-4 h-4 text-amber-600" />
              <span>1. Good Condition (Rain or Shine)</span>
            </span>
            <span className="text-[10px] text-amber-700 font-bold bg-white px-2 py-0.5 rounded-full border border-amber-200">
              Structural Audit
            </span>
          </label>
          <label className="flex items-start gap-2.5 p-2 rounded-xl bg-white border border-amber-200/60 cursor-pointer hover:bg-amber-50/30 transition-colors">
            <input
              type="checkbox"
              checked={rainOrShineOnly}
              onChange={(e) => setRainOrShineOnly?.(e.target.checked)}
              className="accent-amber-600 w-4 h-4 rounded mt-0.5 shrink-0"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-800">Require Verified Good Condition (Rain or Shine)</span>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Only show pads verified for leak-free metal roofs, covered dry walkways during monsoon rains, and heat-insulating airflow on sunny days.
              </p>
            </div>
          </label>
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST ITEM 2: FLOOD SAFE ZONE                        */}
        {/* ======================================================== */}
        <div className="space-y-1 p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100">
          <label className="flex items-start justify-between cursor-pointer gap-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-black text-emerald-950">2. Flood-Safe Zone Guaranteed</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  High-ground elevation (+2.0m+) with dry footpaths during monsoon surges.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={floodFreeOnly}
              onChange={(e) => setFloodFreeOnly(e.target.checked)}
              className="accent-emerald-600 w-4 h-4 rounded mt-1 shrink-0"
            />
          </label>
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST ITEM 3: WATER SYSTEM CONDITION                 */}
        {/* ======================================================== */}
        <div className="space-y-1 p-3 rounded-2xl bg-sky-50/50 border border-sky-100">
          <label className="flex items-start justify-between cursor-pointer gap-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
                <Droplets className="w-4 h-4 text-sky-600" />
              </div>
              <div>
                <p className="text-xs font-black text-sky-950">3. Uninterrupted Water System</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  1,000L+ overhead reserve tank + auto booster pump (no 7:30 AM pressure delays).
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={boosterPumpOnly}
              onChange={(e) => setBoosterPumpOnly(e.target.checked)}
              className="accent-blue-600 w-4 h-4 rounded mt-1 shrink-0"
            />
          </label>
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST ITEM 4: BROWNOUT RESILIENCE CONDITION          */}
        {/* ======================================================== */}
        <div className="space-y-1 p-3 rounded-2xl bg-amber-50/50 border border-amber-100">
          <label className="flex items-start justify-between cursor-pointer gap-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
              </div>
              <div>
                <p className="text-xs font-black text-amber-950">4. Brownout Resilience Kit</p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Solar automated hallway lights or standby generator during ANECO power outages.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={powerBackupOnly}
              onChange={(e) => setPowerBackupOnly(e.target.checked)}
              className="accent-amber-600 w-4 h-4 rounded mt-1 shrink-0"
            />
          </label>
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST ITEM 5: MOBILE DATA SPEED (DITO, SMART, GLOBE) */}
        {/* ======================================================== */}
        <div className="space-y-2 p-3 rounded-2xl bg-purple-50/50 border border-purple-100">
          <label className="flex items-start justify-between cursor-pointer gap-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 mt-0.5">
                <Signal className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-black text-purple-950">5. Mobile Data In-Room Signal</p>
                  <span className="text-[10px] text-purple-700 font-bold bg-white px-2 py-0.5 rounded-full border border-purple-200">
                    DITO • Smart • Globe
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  High-speed 5G/4G coverage tested inside study rooms & bed spaces.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(mobile5GOnly || (mobileProvider && mobileProvider !== 'all'))}
              onChange={(e) => {
                const checked = e.target.checked;
                setMobile5GOnly(checked);
                if (!checked) {
                  setMobileProvider('all');
                }
              }}
              className="accent-purple-600 w-4 h-4 rounded mt-1 shrink-0 cursor-pointer"
            />
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs pt-1">
            {[
              { id: 'all', label: 'Any SIM' },
              { id: 'dito', label: 'DITO 5G' },
              { id: 'smart', label: 'Smart 5G' },
              { id: 'globe', label: 'Globe 5G' }
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setMobileProvider(p.id);
                  if (p.id !== 'all') {
                    setMobile5GOnly(true);
                  } else {
                    setMobile5GOnly(false);
                  }
                }}
                className={`py-2 px-1.5 rounded-xl font-bold border transition-all text-center truncate ${
                  mobileProvider === p.id
                    ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST ITEM 6: WI-FI SPEEDTEST ON-SITE                */}
        {/* ======================================================== */}
        <div className="space-y-2 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
          <label className="flex items-start justify-between cursor-pointer gap-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <Wifi className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-black text-indigo-950">6. Wi-Fi Speedtest™ Audit</p>
                  <span className="text-[10px] text-indigo-700 font-bold bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    Fiber Internet
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Verified high-speed connection for online classes & academic research.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={Boolean(fastWifiOnly || minWifiSpeed > 0)}
              onChange={(e) => {
                const checked = e.target.checked;
                setFastWifiOnly(checked);
                if (checked) {
                  if (minWifiSpeed === 0) setMinWifiSpeed(50);
                } else {
                  setMinWifiSpeed(0);
                }
              }}
              className="accent-indigo-600 w-4 h-4 rounded mt-1 shrink-0 cursor-pointer"
            />
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs pt-1">
            {[
              { val: 0, label: 'Any Speed' },
              { val: 35, label: '35+ Mbps' },
              { val: 50, label: '50+ Mbps' },
              { val: 60, label: '60+ Mbps' }
            ].map(s => (
              <button
                key={s.val}
                type="button"
                onClick={() => {
                  setMinWifiSpeed(s.val);
                  setFastWifiOnly(s.val >= 50);
                }}
                className={`py-2 px-1.5 rounded-xl font-bold border transition-all text-center truncate ${
                  minWifiSpeed === s.val
                    ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* CAMPUS WALKING DISTANCE & COMMUTE PREFERENCE             */}
        {/* ======================================================== */}
        <div className="space-y-2 p-3 rounded-2xl bg-blue-50/50 border border-blue-100">
          <label className="text-xs font-black text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-blue-900">
              <Footprints className="w-4 h-4 text-blue-600" />
              <span>Campus Walking Distance & Commute Preference</span>
            </span>
            <span className="text-[10px] text-blue-600 font-bold bg-white px-2 py-0.5 rounded-full border border-blue-200">
              Walking Route
            </span>
          </label>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            {[
              { id: 'any', val: 0, label: 'Any' },
              { id: '5', val: 5, label: '≤ 5 min' },
              { id: '10', val: 10, label: '≤ 10 min' },
              { id: 'custom', val: 'custom', label: 'Custom' }
            ].map(opt => {
              const isSelected = opt.id === 'custom'
                ? isCustomDistance
                : (!isCustomDistance && maxWalkMinutes === opt.val && (!minWalkMinutes || minWalkMinutes === 0) && (!maxDistanceMeters || maxDistanceMeters === 0));

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.id === 'custom') {
                      setIsCustomDistance(true);
                      if (!customDistanceInput && maxDistanceMeters > 0) {
                        setCustomDistanceInput(`${maxDistanceMeters}m`);
                      }
                    } else {
                      setIsCustomDistance(false);
                      setCustomDistanceInput('');
                      setMaxWalkMinutes(opt.val);
                      if (setMinWalkMinutes) setMinWalkMinutes(0);
                      if (setMaxDistanceMeters) setMaxDistanceMeters(0);
                      if (setMinDistanceMeters) setMinDistanceMeters(0);
                    }
                  }}
                  className={`py-2 px-1 rounded-xl font-bold border transition-all text-center truncate ${
                    isSelected
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Custom Distance Range Input Textbox (BY DISTANCE IN METERS) */}
          {isCustomDistance && (
            <div className="pt-2 border-t border-blue-100 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-950">
                  Custom Distance from School (meters)
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  e.g. "300m" or "200m-500m"
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={customDistanceInput}
                    onChange={(e) => handleCustomDistanceChange(e.target.value)}
                    placeholder="Enter distance (e.g. 350m or 200m-500m)"
                    className="w-full text-xs font-bold px-3 py-2 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
                    autoFocus
                  />
                  {customDistanceInput && (
                    <button
                      type="button"
                      onClick={() => handleCustomDistanceChange('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className="text-[11px] font-extrabold text-blue-900 bg-blue-100/70 px-2.5 py-2 rounded-xl shrink-0 border border-blue-200">
                  {minDistanceMeters > 0 && maxDistanceMeters > 0
                    ? `${minDistanceMeters}m–${maxDistanceMeters}m`
                    : maxDistanceMeters > 0
                    ? `≤ ${maxDistanceMeters}m`
                    : 'Any distance'}
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                {minDistanceMeters > 0 && maxDistanceMeters > 0
                  ? `Filtering pads between ${minDistanceMeters}m and ${maxDistanceMeters}m from FSUU campus gates.`
                  : maxDistanceMeters > 0
                  ? `Filtering pads within ${maxDistanceMeters} meters (~${Math.round(maxDistanceMeters / 75)} min walk) from FSUU campus gates.`
                  : 'Enter a distance limit or range in meters (e.g. 300m or 200m-500m).'}
              </p>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CHECKLIST & AMENITIES ITEM 7: INCLUDED AMENITIES & FACILITIES */}
        {/* ======================================================== */}
        <div className="space-y-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>7. Included Amenities & Facilities</span>
            </label>
            <div className="flex items-center gap-1.5">
              {selectedAmenities.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedAmenities([])}
                  className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                >
                  Clear ({selectedAmenities.length})
                </button>
              )}
              <span className="text-[10px] text-blue-900 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {selectedAmenities.length > 0 ? `${selectedAmenities.length} Required` : 'Any Amenities'}
              </span>
            </div>
          </div>

          {/* Amenity Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={amenityQuery}
              onChange={(e) => setAmenityQuery(e.target.value)}
              placeholder="Search / type custom amenity (e.g. Inverter, Locker, Desk)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#0b1a30] text-slate-900 placeholder:text-slate-400 font-medium"
            />
            {amenityQuery && (
              <button
                type="button"
                onClick={() => setAmenityQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Active Required Amenities Tags */}
          {selectedAmenities.length > 0 && (
            <div className="flex flex-wrap gap-1 p-2 bg-white rounded-xl border border-blue-100">
              <span className="text-[10px] font-bold text-slate-400 self-center mr-1">Must have:</span>
              {selectedAmenities.map(am => (
                <span
                  key={am}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-900 text-[11px] font-bold border border-blue-200"
                >
                  <Check className="w-3 h-3 text-blue-600 stroke-[3]" />
                  <span>{am}</span>
                  <button
                    type="button"
                    onClick={() => toggleAmenity(am)}
                    className="hover:text-red-600 ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Amenity Options Grid */}
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-0.5 text-xs">
            {filteredAmenities.map(am => {
              const isSelected = selectedAmenities.includes(am);
              return (
                <button
                  key={am}
                  type="button"
                  onClick={() => toggleAmenity(am)}
                  className={`p-2 rounded-xl font-bold border text-left flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/80'
                  }`}
                >
                  <span className="truncate">{am}</span>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 stroke-[3]" />
                  ) : (
                    <Plus className="w-3 h-3 text-slate-400 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Custom amenity add option if query doesn't match existing */}
            {amenityQuery.trim() && !filteredAmenities.some(a => a.toLowerCase() === amenityQuery.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={() => {
                  toggleAmenity(amenityQuery.trim());
                  setAmenityQuery('');
                }}
                className="col-span-2 p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>Require custom amenity: "{amenityQuery.trim()}"</span>
              </button>
            )}
          </div>
        </div>

        {/* Subdivision / Zone Selector */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <label className="text-xs font-bold text-[#0b1a30] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Butuan Subdivision / Zone</span>
          </label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {zonesList.map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                  selectedZone === zone
                    ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* Room Type & Gender Policy */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1a30]">Room Accommodation Type</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {['All', 'Solo Room', 'Bedspace'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedRoomType && setSelectedRoomType(t)}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                    selectedRoomType === t
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1a30]">Tenant / Gender Policy</label>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              {['All', 'Female Only', 'Male Only'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenderFilter && setGenderFilter(g)}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                    genderFilter === g
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly Budget Slider & Custom Textbox */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-800 font-extrabold">Max Monthly Boarding Cost</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-semibold">Budget:</span>
              <span className="text-xs text-[#0b1a30] font-black bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {maxBudget >= 8000 ? '₱8,000+ (No Limit)' : `₱${Number(maxBudget).toLocaleString()}/mo`}
              </span>
            </div>
          </div>

          {/* Range Slider */}
          <div className="space-y-1">
            <input
              type="range"
              min="1000"
              max="8000"
              step="100"
              value={Math.min(Math.max(Number(maxBudget) || 1000, 1000), 8000)}
              onChange={(e) => setMaxBudget(parseInt(e.target.value, 10))}
              className="w-full accent-[#0b1a30] cursor-pointer h-2 bg-slate-200 rounded-lg appearance-none"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-0.5">
              <span>₱1,000 (Bedspace)</span>
              <span>₱4,000 (Avg)</span>
              <span>₱8,000+ (Any Budget)</span>
            </div>
          </div>

          {/* Quick Presets & Custom Number Input Textbox */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {[
              { label: 'Any Budget', val: 8000 },
              { label: '≤ ₱2.5k', val: 2500 },
              { label: '≤ ₱3.5k', val: 3500 },
              { label: '≤ ₱5k', val: 5000 }
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setMaxBudget(preset.val)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                  maxBudget === preset.val
                    ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}

            <div className="relative ml-auto flex items-center">
              <span className="absolute left-2.5 text-xs font-bold text-slate-400">₱</span>
              <input
                type="number"
                min="500"
                max="25000"
                step="100"
                placeholder="Custom"
                value={maxBudget >= 8000 ? '' : maxBudget}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setMaxBudget(val);
                  } else if (e.target.value === '') {
                    setMaxBudget(8000);
                  }
                }}
                className="w-24 pl-6 pr-2 py-1 text-xs font-bold border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0b1a30] bg-white"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={handleResetAll}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-[#0b1a30] hover:bg-[#152a4d] text-white font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Show {matchingCount} Inspected Pads</span>
          </button>
        </div>
      </div>
    </div>
  );
}
