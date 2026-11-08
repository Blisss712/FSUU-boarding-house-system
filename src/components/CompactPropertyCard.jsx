import React, { useState } from 'react';
import { Heart, Star, ChevronRight, Footprints, Bus, BadgeCheck, Check } from 'lucide-react';
import StudentChecklistTags from './StudentChecklistTags';
import LandlordProfileSheet from './LandlordProfileSheet';
import MessageLandlordButton from './MessageLandlordButton';
import { getGateDistance } from '../utils/distance';

export default function CompactPropertyCard({
  property,
  onSelectProperty,
  isSaved,
  onToggleSave,
  allProperties = [],
  onViewLandlord,
  onOpenChat,
  onOpenAuth
}) {
  const {
    id,
    name,
    shortLocation,
    roomType,
    price,
    priceSubtext,
    rating,
    reviewCount,
    images,
    landlord
  } = property;

  // Landlord's choice: walking minutes or commute minutes in the feed.
  const gateDistance = getGateDistance(property);
  const accountVerified = landlord?.isUriosVerified === true;
  const [showLandlord, setShowLandlord] = useState(false);

  return (
    <>
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 ${
        property.badges?.isUriosVerified
          ? 'border border-emerald-500 ring-1 ring-emerald-500/40 shadow-[0_2px_12px_rgba(16,185,129,0.12)]'
          : 'border border-slate-200/70'
      }`}>
        {/* Main tappable area */}
        <div
          onClick={() => onSelectProperty(property)}
          className="p-2.5 flex items-center gap-3 cursor-pointer group active:scale-[0.99]"
        >
          {/* Thumbnail */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-100 shrink-0">
            <img
              src={images[0]}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            {/* Save Button (Boarders only) */}
            {onToggleSave && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleSave(id); }}
                className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
                  isSaved ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-500 hover:text-red-500'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-white stroke-none' : 'stroke-[2]'}`} />
              </button>
            )}

            {/* Walk / commute time (whichever the landlord advertises) */}
            {gateDistance && (
              <div className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 ${
                gateDistance.walkMinutes <= 5 ? 'bg-emerald-500 text-white' : gateDistance.walkMinutes <= 10 ? 'bg-amber-500 text-white' : 'bg-black/70 text-white'
              }`}>
                {gateDistance.isRide
                  ? <Bus className="w-2.5 h-2.5" />
                  : <Footprints className="w-2.5 h-2.5" />}
                <span>{gateDistance.minutes} min</span>
                {gateDistance.meters >= 1000 && (
                  <span className="opacity-75">· {gateDistance.distanceLabel}</span>
                )}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <span className="text-[#854d0e] font-semibold truncate">
                  {shortLocation} • {roomType}
                </span>
                <span
                  className="flex items-center gap-0.5 bg-amber-50 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded border border-amber-200 shrink-0 ml-1"
                  title="Student rating for this boarding house"
                >
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  {Number(reviewCount) > 0
                    ? `${Number(rating || 0).toFixed(1)} (${reviewCount})`
                    : 'No ratings'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <h4 className="font-extrabold text-[14px] text-[#0b1a30] leading-tight truncate group-hover:text-blue-800 transition-colors">
                  {name}
                </h4>
                {property.badges?.isUriosVerified && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 shrink-0">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-2 h-2 stroke-[3.5]" />
                    </span>
                    <span>Urios Verified</span>
                  </span>
                )}
              </div>

              <div className="mt-1.5">
                <StudentChecklistTags property={property} compact={true} />
              </div>

              {Array.isArray(property.amenities) && property.amenities.length > 0 && (
                <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500 font-medium truncate">
                  <span className="font-bold text-slate-600 shrink-0">Included:</span>
                  <span className="truncate">
                    {property.amenities.slice(0, 3).map(a => typeof a === 'string' ? a : a?.name).join(' • ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1.5">
              <div>
                <span className="text-[15px] font-black text-[#0b1a30]">₱{price.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-semibold ml-0.5">{priceSubtext}</span>
              </div>
              <div className="flex items-center gap-0.5 text-[11px] font-bold text-blue-700 group-hover:translate-x-0.5 transition-transform">
                <span>View</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Landlord strip — separate tap targets: profile + message */}
        {landlord && (
          <div className="w-full flex items-stretch border-t border-slate-100 bg-slate-50/60">
            <button
              onClick={(e) => { e.stopPropagation(); setShowLandlord(true); }}
              className="flex-1 min-w-0 flex items-center gap-2 pl-3 pr-1 py-2 hover:bg-slate-100 transition-colors group/ll cursor-pointer text-left"
              title="View landlord profile"
            >
              <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                {landlord.initials || landlord.name?.slice(0, 2).toUpperCase() || 'LL'}
              </div>
              <p className="text-[11px] font-semibold text-slate-600 truncate flex-1 min-w-0 flex items-center gap-1">
                <span className="truncate">{landlord.name || 'Landlord'}</span>
                {accountVerified && (
                  <BadgeCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                )}
              </p>
              <span className="ml-auto text-[10px] text-blue-600 font-bold group-hover/ll:underline shrink-0 whitespace-nowrap hidden sm:inline">
                View profile
              </span>
            </button>

            <div className="flex items-center pr-2 pl-1 shrink-0">
              <MessageLandlordButton
                property={property}
                label="Message"
                size="xs"
                variant="solid"
                onOpenChat={onOpenChat}
                onOpenAuth={onOpenAuth}
              />
            </div>
          </div>
        )}
      </div>

      {showLandlord && (
        <LandlordProfileSheet
          landlord={landlord}
          allProperties={allProperties}
          currentProperty={property}
          onSelectProperty={onSelectProperty}
          onViewFullProfile={() => onViewLandlord?.(landlord)}
          onOpenChat={onOpenChat}
          onOpenAuth={onOpenAuth}
          onClose={() => setShowLandlord(false)}
        />
      )}
    </>
  );
}
