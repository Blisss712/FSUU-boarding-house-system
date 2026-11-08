import React, { useState } from 'react';
import { School, ShieldCheck, ArrowRight, List } from 'lucide-react';
import PropertyMap from './PropertyMap';

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

      {/* Real OpenStreetMap surface */}
      <div className="relative flex-1 w-full h-full">
        <PropertyMap
          properties={properties}
          selectedId={selectedPinId}
          onSelectProperty={(p) => setSelectedPinId(p.id)}
          floodFreeOnly={floodFreeOnly}
          compact
          className="serjon-map--fullscreen"
        />
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
          {activeProperty.images?.[0] && (
            <img
              src={activeProperty.images[0]}
              alt={activeProperty.name}
              className="w-20 h-20 rounded-2xl object-cover shrink-0"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-[#854d0e] font-bold truncate">{activeProperty.shortLocation}</span>
              <span className="font-extrabold text-[#78350f] bg-[#fef3c7] px-1.5 rounded text-[10px]" title="Student rating for this boarding house">
                {Number(activeProperty.reviewCount) > 0
                  ? `★ ${Number(activeProperty.rating || 0).toFixed(1)}`
                  : '★ New'}
              </span>
            </div>

            <h4 className="font-extrabold text-[13px] text-[#0b1a30] truncate">
              {activeProperty.name}
            </h4>

            <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-slate-600">
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900">
                {activeProperty.badges?.walk || 'Walk time N/A'}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900">
                🛡️ Flood-Safe
              </span>
            </div>

            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-100">
              <span className="text-[13px] font-black text-[#0b1a30]">
                ₱{Number(activeProperty.price || 0).toLocaleString()}<span className="text-[9px] text-slate-400 font-normal">/mo</span>
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
