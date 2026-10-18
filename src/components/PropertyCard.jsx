import React from 'react';
import { 
  Heart, 
  Footprints, 
  Bike, 
  ShieldCheck, 
  Wifi, 
  Droplets, 
  Zap, 
  Lock, 
  Star, 
  ArrowRight,
  Video,
  Calculator
} from 'lucide-react';

export default function PropertyCard({ 
  property, 
  onSelectProperty, 
  isSaved, 
  onToggleSave,
  onOpenCostCalc,
  onOpenWalkPov 
}) {
  const {
    id,
    name,
    shortLocation,
    roomType,
    statusTag,
    statusColor,
    price,
    priceSubtext,
    rating,
    landlord,
    images,
    gateProximities,
    trikeFare,
    floodRating,
    waterSystem,
    powerSystem,
    wifiAudit
  } = property;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Image Showcase */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={images[0]}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />

        {/* Gradient shadow for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

        {/* Status Tag */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-tight shadow-sm backdrop-blur-md ${
            statusColor === 'orange'
              ? 'bg-amber-500/90 text-white'
              : 'bg-white/95 text-slate-900 border border-slate-100'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              statusColor === 'orange' ? 'bg-amber-200 animate-ping' : 'bg-emerald-500'
            }`} />
            {statusTag}
          </span>
        </div>

        {/* Save Bookmark button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(id);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-red-500 hover:bg-white shadow-sm transition-all"
          title="Save Pad"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Quick Action Overlay Pills (POV & Calculator) */}
        <div className="absolute top-3 right-13 z-10 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenWalkPov(property);
            }}
            className="h-8 px-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-[11px] font-medium flex items-center gap-1 transition-all"
            title="Watch 60s Walk-to-Campus POV"
          >
            <Video className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Walk POV</span>
          </button>
        </div>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="px-3 py-1.5 rounded-xl bg-[#0f244a]/90 backdrop-blur-md text-white border border-white/10 shadow-sm">
            <span className="font-extrabold text-base tracking-tight">₱{price.toLocaleString()}</span>
            <span className="text-[11px] text-blue-200 font-medium ml-1">
              {priceSubtext?.includes('All-In') ? '/mo (All-In)' : '/month'}
            </span>
          </div>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Header row: Location & Rating */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1 font-medium">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-600 font-semibold">{shortLocation}</span>
              <span>•</span>
              <span className="text-amber-800 font-bold">{roomType}</span>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md text-amber-800 font-bold text-xs border border-amber-200">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              <span>{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Property Name */}
          <h3 
            onClick={() => onSelectProperty(property)}
            className="font-extrabold text-base text-slate-900 group-hover:text-blue-900 transition-colors cursor-pointer line-clamp-1 mb-2.5"
          >
            {name}
          </h3>

          {/* Feature Chips matching design */}
          <div className="space-y-1.5 mb-3.5">
            {/* Row 1: Gate walk & trike fare */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/70 border border-blue-100 text-slate-800 text-xs font-semibold">
                <Footprints className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span className="truncate">{gateProximities.mainSFGate?.label || gateProximities.jcAquinoGate?.label}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50/70 border border-amber-100 text-slate-800 text-xs font-semibold">
                <Bike className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate">Trike Fare: {trikeFare}</span>
              </div>
            </div>

            {/* Row 2: Flood-Safe tag */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{floodRating.badge}</span>
            </div>

            {/* Row 3: WiFi Speed & Water/Power */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-semibold">
                <Wifi className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{wifiAudit.badge}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs font-semibold">
                {powerSystem.hasSolarBackup || powerSystem.hasGenerator ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{powerSystem.badge}</span>
                  </>
                ) : (
                  <>
                    <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{waterSystem.tankCapacity}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Landlord Profile & Primary CTA */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
              {landlord.initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                {landlord.name}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate leading-tight">
                {landlord.tag}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectProperty(property)}
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#0e1d3d] hover:bg-[#162a56] text-white text-xs font-bold transition-all shadow-xs shrink-0"
          >
            <span>View Pad</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
