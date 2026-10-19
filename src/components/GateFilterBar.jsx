import React from 'react';
import { Footprints, ShieldCheck, Zap, Droplets, ChevronDown, SlidersHorizontal } from 'lucide-react';

export default function GateFilterBar({
  selectedGate,
  setSelectedGate,
  floodFreeOnly,
  setFloodFreeOnly,
  powerBackupOnly,
  setPowerBackupOnly,
  boosterPumpOnly,
  setBoosterPumpOnly,
  onOpenAdvancedFilter,
  selectedZone
}) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2.5 px-4 bg-white border-b border-slate-100 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-max">
        {/* SF Gate (Main) */}
        <button
          onClick={() => setSelectedGate(selectedGate === 'sf-gate' ? 'all' : 'sf-gate')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
            selectedGate === 'sf-gate'
              ? 'bg-[#0b1a30] text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Footprints className="w-3.5 h-3.5 text-white" />
          <span>SF Gate (Main)</span>
          <ChevronDown className="w-3 h-3 opacity-80" />
        </button>

        {/* JC Aquino Ave Gate */}
        <button
          onClick={() => setSelectedGate(selectedGate === 'jc-gate' ? 'all' : 'jc-gate')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
            selectedGate === 'jc-gate'
              ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-sm leading-none">🏛️</span>
          <span>JC Aquino Gate</span>
        </button>

        {/* Morelos Campus Gate */}
        <button
          onClick={() => setSelectedGate(selectedGate === 'morelos-main' ? 'all' : 'morelos-main')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
            selectedGate === 'morelos-main'
              ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-sm leading-none">🎓</span>
          <span>Morelos Campus</span>
        </button>

        {/* Flood-Free Path */}
        <button
          onClick={() => setFloodFreeOnly(!floodFreeOnly)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
            floodFreeOnly
              ? 'bg-[#064e3b] text-[#ecfdf5] shadow-xs ring-1 ring-[#065f46]'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className={`w-3.5 h-3.5 ${floodFreeOnly ? 'text-emerald-300' : 'text-emerald-600'}`} />
          <span>Flood-Free Path</span>
        </button>

        {/* Backup Gen / Solar */}
        <button
          onClick={() => setPowerBackupOnly(!powerBackupOnly)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
            powerBackupOnly
              ? 'bg-[#b45309] text-white border-[#b45309] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Backup Solar</span>
        </button>

        {/* Booster Pump */}
        <button
          onClick={() => setBoosterPumpOnly(!boosterPumpOnly)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
            boosterPumpOnly
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          <span>Booster Pump</span>
        </button>
      </div>

      {/* Advanced Filter Quick Pill */}
      {selectedZone !== 'All Zones' && (
        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold whitespace-nowrap">
          📍 {selectedZone}
        </span>
      )}
    </div>
  );
}
