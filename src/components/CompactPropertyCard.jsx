import React from 'react';
import { Heart, Footprints, ShieldCheck, Wifi, Star, Zap, Droplets, ChevronRight } from 'lucide-react';

export default function CompactPropertyCard({
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
    images,
    badges,
    powerSystem,
    waterSystem
  } = property;

  return (
    <div 
      onClick={() => onSelectProperty(property)}
      className="bg-white rounded-2xl border border-slate-200/80 p-2.5 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3 cursor-pointer group active:scale-[0.99]"
    >
      {/* Thumbnail Left */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0">
        <img
          src={images[0]}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Small Save Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave(id);
          }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center text-slate-700 hover:text-red-500 shadow-xs"
        >
          <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-red-500 text-red-500' : 'stroke-[2]'}`} />
        </button>

        {/* Micro Status Dot */}
        <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor === 'orange' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          <span className="truncate max-w-[70px]">{statusTag.split(' ')[0]} {statusTag.split(' ')[1]}</span>
        </div>
      </div>

      {/* Info Right */}
      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
        <div>
          {/* Subtitle & Rating */}
          <div className="flex items-center justify-between text-[11px] mb-0.5">
            <span className="text-[#854d0e] font-bold truncate">
              {shortLocation} • {roomType}
            </span>
            <span className="flex items-center gap-0.5 bg-[#fef3c7] text-[#78350f] text-[10px] font-extrabold px-1.5 py-0.2 rounded shrink-0">
              <Star className="w-2.5 h-2.5 fill-[#78350f]" />
              {rating.toFixed(1)}
            </span>
          </div>

          {/* Title */}
          <h4 className="font-extrabold text-[14px] text-[#0b1a30] leading-tight truncate group-hover:text-blue-900 transition-colors">
            {name}
          </h4>

          {/* Micro Badges Row */}
          <div className="flex items-center gap-1 mt-1.5 flex-wrap text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1e293b] flex items-center gap-1">
              <Footprints className="w-3 h-3 text-blue-700" />
              {badges.walk.split(' ')[0]} {badges.walk.split(' ')[1]}
            </span>

            <span className="px-2 py-0.5 rounded-md bg-[#f0fdf4] text-[#166534] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Flood-Safe
            </span>

            {powerSystem.hasSolarBackup ? (
              <span className="px-2 py-0.5 rounded-md bg-[#fffbeb] text-[#92400e] flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                Solar
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-600" />
                Water Tank
              </span>
            )}
          </div>
        </div>

        {/* Price & CTA Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
          <div>
            <span className="text-[15px] font-black text-[#0b1a30]">₱{price.toLocaleString()}</span>
            <span className="text-[10px] text-slate-400 font-semibold ml-0.5">{priceSubtext}</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-[#0b1a30] group-hover:translate-x-0.5 transition-transform">
            <span>View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
