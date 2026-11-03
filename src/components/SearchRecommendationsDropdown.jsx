import React from 'react';
import {
  ShieldCheck,
  Droplets,
  Zap,
  Signal,
  Wifi,
  Footprints,
  CloudSun,
  Clock,
  Sparkles,
  MapPin,
  Building,
  Snowflake,
  SlidersHorizontal,
  ChevronRight,
  Search,
  CheckCircle2,
  X
} from 'lucide-react';

// The 6 Student Reality Checklist Recommendations
const CHECKLIST_RECOMMENDATIONS = [
  {
    key: 'flood',
    query: 'Zero Flood',
    badge: 'Flood-Safe Zone',
    description: 'Elevated footpath & zero typhoon surge history',
    Icon: ShieldCheck,
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200 group-hover:border-emerald-300'
  },
  {
    key: 'booster',
    query: 'Booster Pump',
    badge: 'Water Booster Pump',
    description: '24/7 strong tap pressure & overhead reserve tank',
    Icon: Droplets,
    colorClass: 'text-sky-700 bg-sky-50 border-sky-200 group-hover:border-sky-300'
  },
  {
    key: 'solar',
    query: 'Solar Backup',
    badge: 'Solar / Brownout Backup',
    description: 'Emergency lights & power during ANECO blackouts',
    Icon: Zap,
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200 group-hover:border-amber-300'
  },
  {
    key: '5g',
    query: '5G Signal',
    badge: '5G Mobile Signal',
    description: 'Strong Smart & Globe cellular reception inside rooms',
    Icon: Signal,
    colorClass: 'text-rose-700 bg-rose-50 border-rose-200 group-hover:border-rose-300'
  },
  {
    key: 'wifi',
    query: 'Fast Wi-Fi',
    badge: '50+ Mbps Fiber Wi-Fi',
    description: 'Audited high-speed study & thesis connection',
    Icon: Wifi,
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200 group-hover:border-indigo-300'
  },
  {
    key: 'rainOrShine',
    query: 'Rain or Shine',
    badge: 'Good Condition (Rain or Shine)',
    description: 'Audited leak-free roof, dry corridors & weather-resilient building',
    Icon: CloudSun,
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200 group-hover:border-amber-300'
  },
  {
    key: 'curfew',
    query: 'No Curfew',
    badge: 'No Curfew / Flexible Hours',
    description: 'Ideal for nursing duties, thesis lab, and night study',
    Icon: Clock,
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200 group-hover:border-purple-300'
  }
];

// Popular preset amenities
const DEFAULT_AMENITY_RECOMMENDATIONS = [
  'Inverter Aircon',
  'Study Desk & Chair',
  'Free Purified Water',
  'Private In-Room T&B',
  'Submetered Electricity',
  '24/7 CCTV Security',
  'Biometric Gate Access',
  'Shared Kitchen & Induction Cooktop',
  'Refrigerator & Microwave Access',
  'Individual Steel Locker',
  'Rooftop Clothes Drying Deck'
];

// FSUU student hubs / zones
const ZONE_RECOMMENDATIONS = [
  { name: 'San Ignacio', desc: 'Quiet student enclave' },
  { name: 'Guingona Subd', desc: 'Nearest SF Gate' },
  { name: 'Montilla Blvd', desc: 'Transit & food row' },
  { name: 'R. Calo', desc: 'JC Aquino Gate access' },
  { name: 'Bayanihan', desc: 'Budget-friendly pads' }
];

export default function SearchRecommendationsDropdown({
  searchQuery = '',
  onSelectQuery,
  onSelectProperty,
  properties = [],
  availableAmenities = [],
  onClose,
  onOpenFilters
}) {
  const query = (searchQuery || '').trim().toLowerCase();

  // Combined list of unique amenities
  const allAmenities = React.useMemo(() => {
    const set = new Set(DEFAULT_AMENITY_RECOMMENDATIONS);
    (availableAmenities || []).forEach(a => {
      if (a && typeof a === 'string' && a.trim()) set.add(a.trim());
    });
    return Array.from(set);
  }, [availableAmenities]);

  // Filter recommendations when query is active
  const matchingChecklist = React.useMemo(() => {
    if (!query) return CHECKLIST_RECOMMENDATIONS;
    return CHECKLIST_RECOMMENDATIONS.filter(item =>
      item.query.toLowerCase().includes(query) ||
      item.badge.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  }, [query]);

  const matchingAmenities = React.useMemo(() => {
    if (!query) return allAmenities.slice(0, 8);
    return allAmenities.filter(amenity =>
      amenity.toLowerCase().includes(query)
    );
  }, [allAmenities, query]);

  const matchingZones = React.useMemo(() => {
    if (!query) return ZONE_RECOMMENDATIONS;
    return ZONE_RECOMMENDATIONS.filter(zone =>
      zone.name.toLowerCase().includes(query) ||
      zone.desc.toLowerCase().includes(query)
    );
  }, [query]);

  // Find direct matching properties when user types
  const matchingProperties = React.useMemo(() => {
    if (!query) return [];
    return properties.filter(p => {
      const name = (p.name || '').toLowerCase();
      const area = (p.area || '').toLowerCase();
      const zone = (p.zone || '').toLowerCase();
      const room = (p.roomType || '').toLowerCase();
      return name.includes(query) || area.includes(query) || zone.includes(query) || room.includes(query);
    }).slice(0, 4);
  }, [properties, query]);

  const handleSelect = (text) => {
    onSelectQuery?.(text);
    onClose?.();
  };

  const handlePropertyClick = (property) => {
    if (onSelectProperty) {
      onSelectProperty(property);
      onClose?.();
    } else {
      handleSelect(property.name);
    }
  };

  return (
    <div
      className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden text-left"
      style={{ filter: 'drop-shadow(0 20px 25px rgba(0, 0, 0, 0.12))' }}
      onMouseDown={(e) => {
        // Prevent input blur when clicking inside the dropdown
        e.stopPropagation();
      }}
    >
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-700">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>{query ? `Suggestions for "${searchQuery}"` : 'Recommended Searches for Urios Students'}</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenFilters && (
            <button
              type="button"
              onClick={() => {
                onClose?.();
                onOpenFilters();
              }}
              className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Full Filters</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            title="Close suggestions"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="max-h-[min(540px,76vh)] overflow-y-auto divide-y divide-slate-100 p-2 sm:p-3 space-y-3">
        
        {/* Quick Suggestion Pills */}
        {!query && (
          <div className="pt-1 pb-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
              Popular Quick Searches
            </p>
            <div className="flex flex-wrap gap-1.5 px-1">
              {[
                { label: 'Inverter Aircon', query: 'Aircon', icon: Snowflake },
                { label: 'Zero Flood', query: 'Zero Flood', icon: ShieldCheck },
                { label: 'Booster Pump', query: 'Booster Pump', icon: Droplets },
                { label: 'Solar Backup', query: 'Solar Backup', icon: Zap },
                { label: 'Smart 5G', query: '5G Signal', icon: Signal },
                { label: 'Rain or Shine', query: 'Rain or Shine', icon: CloudSun },
                { label: 'Study Desk', query: 'Study Desk', icon: Sparkles },
                { label: 'No Curfew', query: 'No Curfew', icon: Clock }
              ].map(pill => {
                const Icon = pill.icon;
                return (
                  <button
                    key={pill.label}
                    type="button"
                    onClick={() => handleSelect(pill.query)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200/80 hover:border-blue-200 transition-all cursor-pointer shrink-0"
                  >
                    <Icon className="w-3 h-3 text-slate-500" />
                    <span>{pill.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 1: The Student Reality Checklist */}
        {matchingChecklist.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Student Reality Checklist Items
              </span>
              <span className="text-[10px] font-bold text-slate-400">100% Urios Audited</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {matchingChecklist.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelect(item.query)}
                    className="flex items-start gap-2.5 p-2 rounded-xl text-left border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all group cursor-pointer"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${item.colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-800 group-hover:text-blue-900 truncate">
                          {item.badge}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight line-clamp-1 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Included Room & Pad Amenities */}
        {matchingAmenities.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1">
                <Building className="w-3 h-3 text-blue-600" />
                Included Amenities & Facilities
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Click to search</span>
            </div>

            <div className="flex flex-wrap gap-1.5 px-1">
              {matchingAmenities.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => handleSelect(amenity)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-blue-50/60 hover:bg-blue-100/90 text-blue-950 border border-blue-200/70 hover:border-blue-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                  <span>{amenity}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Matching Properties (when query is active) */}
        {matchingProperties.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1">
                <Search className="w-3 h-3 text-slate-500" />
                Matching Boarding Houses
              </span>
              <span className="text-[10px] text-slate-400 font-bold">{matchingProperties.length} found</span>
            </div>

            <div className="space-y-1">
              {matchingProperties.map(property => (
                <button
                  key={property.id}
                  type="button"
                  onClick={() => handlePropertyClick(property)}
                  className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-200"
                >
                  {property.coverImage ? (
                    <img
                      src={property.coverImage}
                      alt={property.name}
                      className="w-11 h-11 rounded-lg object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
                      <Building className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-900 group-hover:text-blue-900 truncate">
                        {property.name}
                      </p>
                      <span className="text-xs font-extrabold text-[#0b1a30] shrink-0">
                        ₱{property.price?.toLocaleString()}/mo
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {property.zone || property.area || 'FSUU Vicinity'}
                      </span>
                      <span>•</span>
                      <span>{property.roomType || 'Room'}</span>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 4: Popular Campus Zones */}
        {matchingZones.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                Campus Zones & Gates
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 px-1">
              {matchingZones.map(zone => (
                <button
                  key={zone.name}
                  type="button"
                  onClick={() => handleSelect(zone.name)}
                  className="px-2.5 py-1 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition-colors cursor-pointer"
                  title={zone.desc}
                >
                  <span>{zone.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fallback if user types something with 0 matches */}
        {query && matchingChecklist.length === 0 && matchingAmenities.length === 0 && matchingProperties.length === 0 && matchingZones.length === 0 && (
          <div className="py-6 text-center text-slate-500">
            <Search className="w-7 h-7 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">No exact recommendations for "{searchQuery}"</p>
            <p className="text-[11px] text-slate-400 mt-1">Press Enter to search all listing names, descriptions, and landlord notes.</p>
          </div>
        )}
      </div>

      {/* Footer bar */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>💡 Click any recommendation to auto-filter pads</span>
        <button
          type="button"
          onClick={() => handleSelect('')}
          className="font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          Reset Search
        </button>
      </div>
    </div>
  );
}
