import React, { useState } from 'react';
import { X, MapPin, Footprints, ShieldCheck, Zap, Bike, ExternalLink, School } from 'lucide-react';

export default function MapViewModal({ properties, onSelectProperty, onClose }) {
  const [selectedPropId, setSelectedPropId] = useState(properties[0]?.id);
  const activeProp = properties.find(p => p.id === selectedPropId) || properties[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 my-auto flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-600" />
              Butuan City & FSUU Campus Map
            </h3>
            <p className="text-xs text-slate-500">
              Campus gates, safe high-ground zones, and inspected student pads
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map Simulation Container */}
        <div className="mt-3 relative rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 aspect-[16/10] sm:aspect-[16/9] shrink-0">
          {/* Subtle Grid Map Canvas Pattern */}
          <div className="absolute inset-0 bg-[#eef2f6] opacity-90 [background-size:24px_24px] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)]" />

          {/* Agusan River Ribbon (East side buffer) */}
          <div className="absolute top-0 right-0 w-24 h-full bg-blue-200/60 -skew-x-12 border-l-2 border-blue-300 pointer-events-none flex items-center justify-center">
            <span className="text-[10px] font-bold text-blue-500/80 -rotate-90 tracking-widest uppercase">
              Agusan River Basin
            </span>
          </div>

          {/* Flood-Safe High Ground Zone Polygon */}
          <div className="absolute top-8 left-6 right-28 bottom-6 rounded-3xl bg-emerald-100/30 border-2 border-dashed border-emerald-400/50 pointer-events-none p-2">
            <span className="text-[9px] font-extrabold text-emerald-700 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200 shadow-xs">
              🛡️ Certified High-Ground Flood-Free Zone (+2.4m)
            </span>
          </div>

          {/* FSUU Main Campus Landmark */}
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="p-2.5 rounded-2xl bg-[#0f244a] text-white shadow-lg border-2 border-amber-400 flex flex-col items-center text-center">
              <School className="w-5 h-5 text-amber-300 mb-0.5" />
              <span className="text-[10px] font-black leading-tight">FSUU MAIN</span>
              <span className="text-[8px] text-blue-200">SF & JC Aquino Gates</span>
            </div>
          </div>

          {/* FSUU Morelos Campus Landmark (Southwest) */}
          <div className="absolute bottom-6 left-12 z-20">
            <div className="p-2 rounded-xl bg-purple-900 text-white shadow-md border border-purple-400 flex items-center gap-1">
              <School className="w-3.5 h-3.5 text-purple-200" />
              <span className="text-[9px] font-bold">Morelos Campus</span>
            </div>
          </div>

          {/* Property Pins */}
          {properties.map((p, idx) => {
            const isSelected = p.id === selectedPropId;
            // Pre-calculated relative layout offsets around campus
            const positions = [
              { top: '35%', left: '26%' }, // Villa Guingona
              { top: '42%', left: '50%' }, // San Ignacio
              { top: '22%', left: '42%' }, // Montilla
              { top: '60%', left: '40%' }, // Libertad
              { top: '78%', left: '18%' }, // Morelos
              { top: '28%', left: '18%' }  // R. Calo
            ];
            const pos = positions[idx % positions.length];

            return (
              <div
                key={p.id}
                style={{ top: pos.top, left: pos.left }}
                onClick={() => setSelectedPropId(p.id)}
                className="absolute z-20 cursor-pointer -translate-x-1/2 -translate-y-1/2 group"
              >
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1 shadow-md transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 scale-110 ring-4 ring-amber-300'
                    : 'bg-white text-slate-800 border border-slate-300 hover:scale-105'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>₱{p.price}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Pad Card Details inside Map */}
        {activeProp && (
          <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-bold text-slate-900">{activeProp.name}</span>
                <span>•</span>
                <span className="text-amber-800 font-semibold">{activeProp.roomType}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold flex items-center gap-1">
                  <Footprints className="w-3 h-3" />
                  {activeProp.gateProximities.mainSFGate?.label || activeProp.gateProximities.jcAquinoGate?.label}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {activeProp.floodRating.badge}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold">
                  ₱{activeProp.price}/mo
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                onSelectProperty(activeProp);
              }}
              className="px-4 py-2 bg-[#0f244a] hover:bg-[#162a56] text-white text-xs font-bold rounded-xl transition-all shrink-0 flex items-center justify-center gap-1.5"
            >
              <span>View Full Details</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
