import React, { useState } from 'react';
import { School, ShieldCheck, ArrowRight, Check, Bus, Footprints } from 'lucide-react';
import PropertyMap from './PropertyMap';
import { getGateDistance } from '../utils/distance';

export default function DesktopStickyMap({
  properties,
  hoveredPropertyId,
  selectedPropertyId,
  onSelectProperty,
  floodFreeOnly,
  setFloodFreeOnly
}) {
  const [activePinId, setActivePinId] = useState(null);
  const activeProperty = properties.find(p => p.id === (activePinId || hoveredPropertyId || selectedPropertyId)) || properties[0];
  // Whichever time the landlord advertises (walk or commute), never a stale label.
  const gateDistance = getGateDistance(activeProperty);

  return (
    <div className="w-full h-[calc(100vh-180px)] sticky top-[95px] rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-[#eef2f6] flex flex-col select-none">
      
      {/* Top Floating Controls on Map */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-2 pointer-events-auto">
        {/* Campus Focus Header */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-slate-200 text-xs font-bold text-slate-800">
          <School className="w-3.5 h-3.5 text-blue-600" />
          <span>FSUU Main Campus</span>
          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">| SF & JC Aquino Gates</span>
        </div>

        {/* Flood Layer Switch */}
        <button
          onClick={() => setFloodFreeOnly(!floodFreeOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold shadow-sm backdrop-blur-md transition-all border ${
            floodFreeOnly
              ? 'bg-[#064e3b] text-emerald-100 border-[#065f46]'
              : 'bg-white/95 text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
          title="Toggle Verified Flood-Safe High Ground Contour"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>+2.4m Flood Layer: {floodFreeOnly ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Real OpenStreetMap surface */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <PropertyMap
          properties={properties}
          selectedId={activePinId || hoveredPropertyId || selectedPropertyId}
          onSelectProperty={(p) => {
            setActivePinId(p.id);
            onSelectProperty(p);
          }}
          onHoverProperty={(p) => setActivePinId(p.id)}
          floodFreeOnly={floodFreeOnly}
          className="serjon-map--sticky"
        />
      </div>

      {/* Bottom Floating Property Summary Drawer on Map */}
      {activeProperty && (
        <div className="absolute bottom-4 left-4 right-4 z-30 bg-white/95 backdrop-blur-md rounded-3xl p-3.5 shadow-xl border border-slate-200 flex items-center gap-3.5 animate-in slide-in-from-bottom-2 duration-150">
          {activeProperty.images?.[0] && (
            <img
              src={activeProperty.images[0]}
              alt={activeProperty.name}
              className="w-20 h-20 rounded-2xl object-cover shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-[#854d0e] font-bold truncate">{activeProperty.shortLocation}</span>
              <span className="bg-[#fef3c7] text-[#78350f] text-[11px] font-extrabold px-1.5 py-0.2 rounded border border-[#fde68a]" title="Student rating for this boarding house">
                {Number(activeProperty.reviewCount) > 0
                  ? `★ ${Number(activeProperty.rating || 0).toFixed(1)} (${activeProperty.reviewCount})`
                  : '★ No ratings'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="font-extrabold text-[14px] text-[#0b1a30] truncate">
                {activeProperty.name}
              </h4>
              {activeProperty.badges?.isUriosVerified && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 shrink-0">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Check className="w-2 h-2 stroke-[3.5]" />
                  </span>
                  <span>Urios Verified</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-600 flex-wrap">
              <span className="px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1e293b] inline-flex items-center gap-1">
                {gateDistance?.isRide ? <Bus className="w-3 h-3" /> : <Footprints className="w-3 h-3" />}
                {gateDistance ? gateDistance.minutesLabel : 'Distance N/A'}
              </span>
              <span className={`px-2 py-0.5 rounded-md ${activeProperty.floodRating?.isFloodFree !== false && !activeProperty.floodRating?.badge?.toLowerCase().includes('none') ? 'bg-[#f0fdf4] text-[#166534]' : 'bg-amber-50 text-amber-800'}`}>
                {activeProperty.floodRating?.isFloodFree !== false && !activeProperty.floodRating?.badge?.toLowerCase().includes('none') ? '🛡️ Flood-Safe' : '⚠️ Flood Watch'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#f8fafc] text-slate-700">
                📶 {activeProperty.wifiAudit?.hasWifi !== false && !activeProperty.wifiAudit?.provider?.toLowerCase().includes('none') && Number(activeProperty.wifiAudit?.downloadMbps) > 0 ? `${activeProperty.wifiAudit.downloadMbps} Mbps` : 'No Wi-Fi'}
              </span>
            </div>

            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-[#0b1a30]">₱{Number(activeProperty.price || 0).toLocaleString()}</span>
                <span className="text-[11px] text-slate-400 font-semibold">{activeProperty.priceSubtext}</span>
              </div>

              <button
                onClick={() => onSelectProperty(activeProperty)}
                className="px-4 py-1.5 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <span>View Full Pad</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
