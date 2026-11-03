import React from 'react';
import { X, Phone, MessageCircle, BadgeCheck, Home, Star, MapPin, ArrowRight } from 'lucide-react';
import { getGateDistance } from '../utils/distance';

/**
 * LandlordProfileSheet
 * Quick bottom-sheet preview. Has a "View Full Profile" CTA that opens the full page.
 *
 * Props:
 *   landlord            — landlord object from the property
 *   allProperties       — full properties array
 *   currentProperty     — the property this was opened from
 *   onSelectProperty(p) — navigate to a pad
 *   onViewFullProfile() — open the full LandlordProfilePage
 *   onOpenChat(property)— open backend in-app chat modal
 *   onClose()
 */
export default function LandlordProfileSheet({
  landlord,
  allProperties = [],
  currentProperty,
  onSelectProperty,
  onViewFullProfile,
  onOpenChat,
  onClose
}) {
  const theirPads = allProperties.filter(p => p.landlord?.name === landlord.name);
  const targetProperty = currentProperty || theirPads[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col">

        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-slate-200" />
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="px-6 pt-4 pb-5 bg-gradient-to-br from-[#0b1a30] to-[#1a3a6b]">
          <div className="flex items-center gap-4">
            {landlord.avatar ? (
              <img
                src={landlord.avatar}
                alt={landlord.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center font-black text-xl text-white shrink-0">
                {landlord.initials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-base font-extrabold text-white leading-tight">{landlord.name}</h2>
                {landlord.verified !== false && (
                  <BadgeCheck className="w-4 h-4 text-blue-300 shrink-0" />
                )}
              </div>
              <p className="text-xs text-blue-200 font-medium mt-0.5">{landlord.tag}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[11px] text-blue-100">
                  <Home className="w-3 h-3" />
                  {theirPads.length} listing{theirPads.length !== 1 ? 's' : ''}
                </span>
                {theirPads.length > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-100">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    {(theirPads.reduce((s, p) => s + (p.rating || 0), 0) / theirPads.length).toFixed(1)} avg
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {(landlord.phone || targetProperty) && (
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Contact & Inquiries</p>
              <div className="flex gap-2">
                {landlord.phone && (
                  <a
                    href={`tel:${landlord.phone}`}
                    className="flex-1 flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{landlord.phone}</p>
                      <p className="text-[10px] text-slate-500">Tap to call</p>
                    </div>
                  </a>
                )}
                {targetProperty && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenChat?.(targetProperty);
                    }}
                    className={`${landlord.phone ? 'px-4' : 'flex-1'} flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-50 border border-blue-200 hover:bg-blue-100 active:scale-[0.99] transition-all cursor-pointer`}
                    title={`Chat with ${landlord.name || 'Landlord'}`}
                  >
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-bold text-blue-700">Chat</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {theirPads.length > 0 && (
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">
                {theirPads.length === 1 ? 'Their listing' : `All ${theirPads.length} listings`}
              </p>
              <div className="space-y-2">
                {theirPads.map(pad => {
                  const gateDistance = getGateDistance(pad);
                  const isActive = pad.id === currentProperty?.id;
                  return (
                    <button
                      key={pad.id}
                      onClick={() => { onSelectProperty(pad); onClose(); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all hover:shadow-sm active:scale-[0.99] ${
                        isActive ? 'border-[#0b1a30] bg-[#0b1a30]/5' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                        <img src={pad.images?.[0]} alt={pad.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] text-[#0b1a30] leading-tight truncate">
                          {pad.name}
                          {isActive && <span className="ml-1.5 text-[10px] text-blue-600 font-bold">(viewing)</span>}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <p className="text-[11px] text-slate-500 truncate">{pad.shortLocation}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[12px] font-extrabold text-[#0b1a30]">₱{pad.price.toLocaleString()}</span>
                          {gateDistance && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              gateDistance.walkMinutes <= 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {gateDistance.minutesLabel}
                            </span>
                          )}
                          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            pad.availableCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {pad.availableCount > 0 ? `${pad.availableCount} available` : 'Full'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Full Profile CTA */}
          <div className="px-5 py-4">
            <button
              onClick={() => { onClose(); onViewFullProfile(); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm"
            >
              <span>View Full Landlord Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-center text-[10px] text-slate-400 mt-2">
              Includes trust badges, verification status & all listings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
