import React, { useState } from 'react';
import { School, ShieldCheck, ArrowRight, List } from 'lucide-react';

export default function FullScreenMapView({
  properties,
  onSelectProperty,
  onSwitchToList,
  floodFreeOnly,
  setFloodFreeOnly
}) {
  const [selectedPinId, setSelectedPinId] = useState(properties[0]?.id || '');
  const activeProperty = properties.find(p => p.id === selectedPinId) || properties[0];

  return (
    <div className="relative w-full h-[760px] bg-[#eef2f6] overflow-hidden flex flex-col select-none">
      {/* Top Floating Controls on Map */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2">
        {/* Campus Header */}
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-md border border-slate-200/80 text-xs font-bold text-slate-800">
          <School className="w-4 h-4 text-blue-600" />
          <span>FSUU Main Campus (SF & JC Gates)</span>
        </div>

        {/* Flood Layer Quick Switch */}
        <button
          onClick={() => setFloodFreeOnly(!floodFreeOnly)}
          className={`p-2 rounded-2xl shadow-md backdrop-blur-md transition-all border ${
            floodFreeOnly
              ? 'bg-[#064e3b] text-white border-[#065f46]'
              : 'bg-white/90 text-slate-700 border-slate-200'
          }`}
          title="Toggle Flood-Safe Elevation Layer"
        >
          <ShieldCheck className="w-5 h-5" />
        </button>
      </div>

      {/* Interactive Map Visual Surface */}
      <div className="relative flex-1 w-full h-full bg-[#f1f5f9] [background-size:20px_20px] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)]">
        
        {/* Agusan River Ribbon (East buffer) */}
        <div className="absolute top-0 right-0 w-28 h-full bg-blue-200/50 -skew-x-12 border-l-2 border-blue-300 pointer-events-none flex items-center justify-center">
          <span className="text-[10px] font-extrabold text-blue-600/60 -rotate-90 tracking-widest uppercase">
            Agusan River
          </span>
        </div>

        {/* Certified Flood-Safe Zone Contour (+2.4m) */}
        <div className="absolute top-12 left-6 right-32 bottom-20 rounded-[40px] bg-emerald-100/35 border-2 border-dashed border-emerald-400/60 pointer-events-none p-2.5">
          <span className="text-[9px] font-black text-emerald-800 bg-white/90 px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
            🛡️ Certified High-Ground Zone (+2.4m)
          </span>
        </div>

        {/* FSUU Main Campus Landmark */}
        <div className="absolute top-[40%] left-[45%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="px-3 py-2 rounded-2xl bg-[#0b1a30] text-white shadow-xl border-2 border-amber-400 flex flex-col items-center text-center">
            <School className="w-4 h-4 text-amber-300" />
            <span className="text-[10px] font-black leading-tight mt-0.5">FSUU MAIN</span>
            <span className="text-[8px] text-blue-200 font-semibold">SF & JC Aquino Gates</span>
          </div>
        </div>


        {/* Interactive Property Pins */}
        {properties.map((p) => {
          const isSelected = p.id === activeProperty?.id;
          const coords = p.mapCoordinates || { x: 50, y: 50 };

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPinId(p.id)}
              style={{ top: `${coords.y}%`, left: `${coords.x}%` }}
              className="absolute z-30 cursor-pointer -translate-x-1/2 -translate-y-1/2 group transition-all"
            >
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 shadow-lg transition-transform ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 scale-115 ring-4 ring-amber-300 shadow-amber-400/30'
                  : 'bg-[#0b1a30] text-white hover:scale-105 border border-white/20'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-slate-950' : 'bg-emerald-400'}`} />
                <span>₱{(p.price / 1000).toFixed(1)}k</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating "List View" Toggle Pill */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
        <button
          onClick={onSwitchToList}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0b1a30] text-white text-[12.5px] font-black shadow-2xl border border-white/20 hover:scale-102 transition-transform"
        >
          <List className="w-4 h-4 text-amber-400" />
          <span>List View</span>
        </button>
      </div>

      {/* Swipeable Bottom Card Drawer for Active Pin */}
      {activeProperty && (
        <div className="absolute bottom-2 left-3 right-3 z-30 bg-white rounded-3xl p-3 shadow-xl border border-slate-200/80 flex items-center gap-3">
          <img
            src={activeProperty.images[0]}
            alt={activeProperty.name}
            className="w-20 h-20 rounded-2xl object-cover shrink-0"
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-[#854d0e] font-bold truncate">{activeProperty.shortLocation}</span>
              <span className="font-extrabold text-[#78350f] bg-[#fef3c7] px-1.5 rounded text-[10px]">
                ★ {activeProperty.rating.toFixed(1)}
              </span>
            </div>

            <h4 className="font-extrabold text-[13px] text-[#0b1a30] truncate">
              {activeProperty.name}
            </h4>

            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-600">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900">
                {activeProperty.badges.walk.split(' ')[0]} {activeProperty.badges.walk.split(' ')[1]}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900">
                🛡️ Flood-Safe
              </span>
            </div>

            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
              <span className="text-[13px] font-black text-[#0b1a30]">
                ₱{activeProperty.price.toLocaleString()}<span className="text-[9px] text-slate-400 font-normal">/mo</span>
              </span>

              <button
                onClick={() => onSelectProperty(activeProperty)}
                className="px-3 py-1 rounded-xl bg-[#0b1a30] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
              >
                <span>View Pad</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
