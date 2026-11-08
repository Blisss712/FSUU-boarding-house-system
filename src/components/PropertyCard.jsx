import React, { useState } from 'react';
import {
  Heart,
  ArrowRight,
  Star,
  Footprints,
  Bus,
  BadgeCheck,
  Check
} from 'lucide-react';
import StudentChecklistTags from './StudentChecklistTags';
import LandlordProfileSheet from './LandlordProfileSheet';
import MessageLandlordButton from './MessageLandlordButton';
import { getGateDistance } from '../utils/distance';

export default function PropertyCard({
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
    statusTag,
    statusColor,
    price,
    priceSubtext,
    rating,
    reviewCount,
    landlord,
    images
  } = property;

  // Landlord's choice: walking minutes or commute minutes in the feed.
  const gateDistance = getGateDistance(property);
  const accountVerified = landlord?.isUriosVerified === true;
  const [showLandlord, setShowLandlord] = useState(false);

  return (
    <>
      <div className={`bg-white rounded-3xl overflow-hidden flex flex-col group transition-all duration-200 hover:shadow-[0_8px_32px_rgba(11,26,48,0.12)] hover:-translate-y-0.5 ${
        property.badges?.isUriosVerified
          ? 'border border-emerald-500 ring-1 ring-emerald-500/40 shadow-[0_2px_16px_rgba(16,185,129,0.15)]'
          : 'border border-slate-200/60 shadow-[0_2px_16px_rgba(0,0,0,0.05)]'
      }`}>
        {/* Photo with Overlay Badges */}
        <div 
          onClick={() => onSelectProperty?.(property)}
          className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 cursor-pointer"
          title="Click to view pad details"
        >
          <img
            src={images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
          />

          {/* Gradient scrim */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

          {/* Availability Badge */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 items-start">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-sm backdrop-blur-sm ${
              statusColor === 'orange'
                ? 'bg-amber-500 text-white'
                : 'bg-white/95 text-slate-800 border border-slate-200/60'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                statusColor === 'orange' ? 'bg-white' : 'bg-emerald-500'
              }`} />
              {statusTag}
            </span>
          </div>

          {/* Heart Button (Boarders only) */}
          {onToggleSave && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSave(id); }}
              className={`absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 ${
                isSaved
                  ? 'bg-red-500 text-white'
                  : 'bg-white/90 backdrop-blur-sm text-slate-500 hover:text-red-500 hover:bg-white'
              }`}
              title={isSaved ? 'Unsave Pad' : 'Save Pad'}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-white stroke-none' : 'stroke-[2]'}`} />
            </button>
          )}

          {/* Price + Walk time */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between">
            <div className="px-3 py-1.5 rounded-xl bg-[#0b1a30]/90 backdrop-blur-sm text-white shadow-sm flex items-baseline gap-1">
              <span className="font-extrabold text-[16px] tracking-tight">₱{price.toLocaleString()}</span>
              <span className="text-[11px] text-blue-200 font-medium">{priceSubtext}</span>
            </div>

            {gateDistance && (
              <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl backdrop-blur-sm text-[11px] font-bold shadow-sm ${
                gateDistance.minutes <= 5
                  ? 'bg-emerald-500 text-white'
                  : gateDistance.minutes <= 10
                  ? 'bg-amber-500 text-white'
                  : 'bg-white/85 text-slate-800'
              }`}>
                {gateDistance.isRide
                  ? <Bus className="w-3.5 h-3.5" />
                  : <Footprints className="w-3.5 h-3.5" />}
                <span>{gateDistance.minutesLabel}</span>
                {gateDistance.distanceLabel && (
                  <span className="opacity-75">· {gateDistance.distanceLabel}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <div className="flex items-center gap-1 text-[#854d0e] font-semibold text-[12px]">
                <span>{shortLocation}</span>
                <span className="text-slate-300">•</span>
                <span>{roomType}</span>
              </div>
              <div
                className="flex items-center gap-1 bg-amber-50 text-amber-800 text-[11px] font-extrabold px-2 py-0.5 rounded-lg border border-amber-200"
                title="Student rating for this boarding house"
              >
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                {Number(reviewCount) > 0 ? (
                  <>
                    <span>{Number(rating || 0).toFixed(1)}</span>
                    <span className="text-[9px] font-semibold text-amber-700">({reviewCount})</span>
                  </>
                ) : (
                  <span>No ratings</span>
                )}
              </div>
            </div>

            <div className="mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  onClick={() => onSelectProperty(property)}
                  className="font-extrabold text-[17px] text-[#0b1a30] hover:text-blue-800 transition-colors cursor-pointer tracking-tight leading-snug"
                >
                  {name}
                </h3>
                {property.badges?.isUriosVerified && (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-emerald-800">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                    </span>
                    <span>Urios Verified</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mb-2">
              <StudentChecklistTags property={property} />
            </div>

            {/* Included Amenities Quick Chips */}
            {Array.isArray(property.amenities) && property.amenities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Amenities:</span>
                {property.amenities.slice(0, 3).map((a, i) => {
                  const amName = typeof a === 'string' ? a : a?.name;
                  return (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200/80 max-w-[170px] truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                      <span className="truncate">{amName}</span>
                    </span>
                  );
                })}
                {property.amenities.length > 3 && (
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-200">
                    +{property.amenities.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Landlord row + Message / View Pad */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            {/* Clickable landlord section */}
            {landlord && (
              <button
                onClick={(e) => { e.stopPropagation(); setShowLandlord(true); }}
                className="flex items-center gap-2.5 min-w-0 flex-1 group/landlord rounded-xl p-1.5 -m-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                title="View landlord profile"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0 ring-1 ring-slate-200 group-hover/landlord:ring-[#0b1a30] transition-all">
                  {landlord.initials || landlord.name?.slice(0, 2).toUpperCase() || 'LL'}
                </div>
                <div className="min-w-0 text-left">
                  <p className="font-bold text-[13px] text-[#0b1a30] leading-none truncate flex items-center gap-1">
                    {landlord.name || 'Landlord'}
                    {accountVerified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium leading-none mt-1 truncate group-hover/landlord:text-blue-600 transition-colors">
                    {accountVerified ? 'Urios Verified Host' : (landlord.tag || landlord.experience || 'Host')} · View profile
                  </p>
                </div>
              </button>
            )}

            <div className="flex items-center gap-1.5 shrink-0">
              <MessageLandlordButton
                property={property}
                variant="outline"
                labelClassName="hidden sm:inline"
                onOpenChat={onOpenChat}
                onOpenAuth={onOpenAuth}
              />

              <button
                onClick={() => onSelectProperty(property)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0b1a30] hover:bg-blue-900 active:scale-95 text-white text-xs font-bold transition-all shadow-sm shrink-0"
              >
                <span>View Pad</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
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
