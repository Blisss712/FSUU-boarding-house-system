import React from 'react';
import { 
  Heart, 
  Footprints, 
  ShieldCheck, 
  Wifi, 
  Droplets, 
  Zap, 
  Lock, 
  ArrowRight,
  Star,
  ShieldAlert
} from 'lucide-react';

export default function PropertyCard({ 
  property, 
  onSelectProperty, 
  isSaved, 
  onToggleSave 
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
    badges
  } = property;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-md">
      {/* Photo with Overlay Badges */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <img
          src={images[0]}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />

        {/* Top-Left Availability Badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs backdrop-blur-xs ${
            statusColor === 'orange'
              ? 'bg-amber-500 text-white'
              : 'bg-white/95 text-slate-800'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              statusColor === 'orange' ? 'bg-white' : 'bg-emerald-500'
            }`} />
            {statusTag}
          </span>
        </div>

        {/* Top-Right Heart Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(id);
          }}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-red-500 hover:bg-white shadow-xs transition-colors"
          title="Save Pad"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'stroke-[2]'}`} />
        </button>

        {/* Bottom-Left Price Pill Overlay */}
        <div className="absolute bottom-3 left-3 z-10">
          <div className="px-3 py-1.5 rounded-xl bg-[#0b1a30] text-white shadow-sm flex items-baseline gap-1">
            <span className="font-extrabold text-[15px] tracking-tight">₱{price.toLocaleString()}</span>
            <span className="text-[11px] text-blue-200 font-medium">{priceSubtext}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Subtitle & Rating */}
          <div className="flex items-center justify-between text-xs mb-1">
            <div className="flex items-center gap-1.5 text-[#854d0e] font-bold text-[12px]">
              <span>{shortLocation}</span>
              <span>•</span>
              <span>{roomType}</span>
            </div>

            {/* Rating Badge */}
            <div className="flex items-center gap-1 bg-[#fef3c7] text-[#78350f] text-[11px] font-extrabold px-2 py-0.5 rounded-md border border-[#fde68a]">
              <Star className="w-3 h-3 fill-[#78350f] text-[#78350f]" />
              <span>{rating.toFixed(1)}</span>
            </div>
          </div>

          {/* Title */}
          <h3 
            onClick={() => onSelectProperty(property)}
            className="font-extrabold text-[17px] text-[#0b1a30] hover:text-blue-900 transition-colors cursor-pointer tracking-tight leading-snug mb-2.5"
          >
            {name}
          </h3>

          {/* Badges Grid matching mockups */}
          <div className="space-y-1.5 mb-3.5">
            {/* Row 1: Walk to gate + Trike fare / Solar */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff6ff] text-[#1e293b] text-[11.5px] font-semibold truncate">
                <Footprints className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span className="truncate">{badges.walk}</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#fffbeb] text-[#854d0e] text-[11.5px] font-semibold truncate">
                {badges.fare.includes('Trike') ? (
                  <>
                    <span className="text-xs shrink-0">🛺</span>
                    <span className="truncate">{badges.fare}</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-600 shrink-0" />
                    <span className="truncate">{badges.fare}</span>
                  </>
                )}
              </div>
            </div>

            {/* Row 2: Flood-Safe tag */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-[#1e293b] text-[11.5px] font-semibold truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{badges.flood}</span>
            </div>

            {/* Row 3: WiFi Speed & Utility / Security */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-[#334155] text-[11.5px] font-semibold truncate">
                <Wifi className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{badges.wifi}</span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f8fafc] border border-slate-100 text-[#334155] text-[11.5px] font-semibold truncate">
                {badges.utility.includes('Stainless') || badges.utility.includes('Water') ? (
                  <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span className="truncate">{badges.utility}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Landlord Profile & View Pad Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-800 font-extrabold text-xs flex items-center justify-center shrink-0">
              {landlord.initials}
            </div>
            <div className="min-w-0">
              <p className="font-extrabold text-[13px] text-[#0b1a30] leading-none truncate">
                {landlord.name}
              </p>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-1 truncate">
                {landlord.tag}
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectProperty(property)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-bold transition-all shadow-xs shrink-0"
          >
            <span>View Pad</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
