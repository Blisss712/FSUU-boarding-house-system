import React, { useState } from 'react';
import { School, ShieldCheck, MapPin, ExternalLink, ArrowRight } from 'lucide-react';

export default function DesktopStickyMap({
  properties,
  hoveredPropertyId,
  selectedPropertyId,
  onSelectProperty,
  floodFreeOnly,
  setFloodFreeOnly,
  selectedCampus,
  setSelectedCampus
}) {
  const [activePinId, setActivePinId] = useState(null);
  const activeProperty = properties.find(p => p.id === (activePinId || hoveredPropertyId || selectedPropertyId)) || properties[0];

  return (
    <div className="w-full h-[calc(100vh-120px)] sticky top-[95px] rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-[#eef2f6] flex flex-col select-none">
      
      {/* Top Floating Controls on Map */}
      <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-2 pointer-events-auto">
        {/* Campus Focus Pills */}
        <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-2xl shadow-sm border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setSelectedCampus('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedCampus === 'all'
                ? 'bg-[#0b1a30] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Campuses
          </button>
          <button
            onClick={() => setSelectedCampus('fsuu-main')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedCampus === 'fsuu-main'
                ? 'bg-[#0b1a30] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            FSUU Main (SF & JC)
          </button>
          <button
            onClick={() => setSelectedCampus('fsuu-morelos')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              selectedCampus === 'fsuu-morelos'
                ? 'bg-[#0b1a30] text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Morelos Campus
          </button>
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

      {/* Map Surface Canvas */}
      <div className="relative flex-1 w-full h-full bg-[#f1f5f9] [background-size:24px_24px] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] overflow-hidden">
        
        {/* Agusan River Ribbon */}
        <div className="absolute top-0 right-0 w-32 h-full bg-blue-200/50 -skew-x-12 border-l-2 border-blue-300 pointer-events-none flex items-center justify-center">
          <span className="text-[11px] font-black text-blue-600/60 -rotate-90 tracking-widest uppercase">
            Agusan River Basin
          </span>
        </div>

        {/* Verified High Ground Flood-Free Contour */}
        <div className={`absolute top-12 left-6 right-36 bottom-20 rounded-[44px] bg-emerald-100/35 border-2 border-dashed border-emerald-400/60 pointer-events-none p-3 transition-opacity ${
          floodFreeOnly ? 'opacity-100' : 'opacity-25'
        }`}>
          <span className="text-[10px] font-black text-emerald-800 bg-white/95 px-3 py-1 rounded-full border border-emerald-300 shadow-xs">
            🛡️ Certified High-Ground Zone (+2.4m Above River Surge)
          </span>
        </div>

        {/* Landmark: FSUU Main Campus */}
        <div className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="px-3.5 py-2.5 rounded-2xl bg-[#0b1a30] text-white shadow-xl border-2 border-amber-400 flex flex-col items-center text-center">
            <School className="w-5 h-5 text-amber-300" />
            <span className="text-[11px] font-black leading-tight mt-0.5">FSUU MAIN</span>
            <span className="text-[9px] text-blue-200 font-semibold">San Francisco & JC Aquino Gates</span>
          </div>
        </div>

        {/* Landmark: FSUU Morelos Campus */}
        <div className="absolute bottom-[24%] left-[22%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="px-3 py-2 rounded-xl bg-purple-950 text-white shadow-md border border-purple-400 flex items-center gap-1.5">
            <School className="w-4 h-4 text-purple-300" />
            <div>
              <p className="text-[10px] font-black leading-none">FSUU Morelos</p>
              <p className="text-[8px] text-purple-200 leading-none mt-0.5">Libertad Campus</p>
            </div>
          </div>
        </div>

        {/* Interactive Property Pins */}
        {properties.map((p) => {
          const isSelected = p.id === (activePinId || hoveredPropertyId);
          const coords = p.mapCoordinates || { x: 50, y: 50 };

          return (
            <div
              key={p.id}
              onClick={() => {
                setActivePinId(p.id);
                onSelectProperty(p);
              }}
              onMouseEnter={() => setActivePinId(p.id)}
              style={{ top: `${coords.y}%`, left: `${coords.x}%` }}
              className="absolute z-30 cursor-pointer -translate-x-1/2 -translate-y-1/2 group transition-all"
            >
              <div className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg transition-transform ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 scale-120 ring-4 ring-amber-300 shadow-amber-400/40 z-40'
                  : 'bg-[#0b1a30] text-white hover:scale-110 border border-white/20'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                <span>₱{p.price.toLocaleString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Floating Property Summary Drawer on Map */}
      {activeProperty && (
        <div className="absolute bottom-4 left-4 right-4 z-30 bg-white/95 backdrop-blur-md rounded-3xl p-3.5 shadow-xl border border-slate-200 flex items-center gap-3.5 animate-in slide-in-from-bottom-2 duration-150">
          <img
            src={activeProperty.images[0]}
            alt={activeProperty.name}
            className="w-20 h-20 rounded-2xl object-cover shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs mb-0.5">
              <span className="text-[#854d0e] font-bold truncate">{activeProperty.shortLocation}</span>
              <span className="bg-[#fef3c7] text-[#78350f] text-[11px] font-extrabold px-1.5 py-0.2 rounded border border-[#fde68a]">
                ★ {activeProperty.rating.toFixed(1)}
              </span>
            </div>

            <h4 className="font-extrabold text-[14px] text-[#0b1a30] truncate">
              {activeProperty.name}
            </h4>

            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-slate-600">
              <span className="px-2 py-0.5 rounded-md bg-[#eff6ff] text-[#1e293b]">
                {activeProperty.badges.walk}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#f0fdf4] text-[#166534]">
                🛡️ Flood-Safe
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#f8fafc] text-slate-700">
                📶 {activeProperty.wifiAudit.downloadMbps} Mbps
              </span>
            </div>

            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black text-[#0b1a30]">₱{activeProperty.price.toLocaleString()}</span>
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
