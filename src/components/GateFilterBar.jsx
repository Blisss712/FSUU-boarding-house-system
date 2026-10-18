import React from 'react';
import { Footprints, ShieldCheck, Zap, Droplets, ChevronDown } from 'lucide-react';

export default function GateFilterBar({
  selectedGate,
  setSelectedGate,
  floodFreeOnly,
  setFloodFreeOnly,
  powerBackupOnly,
  setPowerBackupOnly,
  boosterPumpOnly,
  setBoosterPumpOnly
}) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2.5 px-4 bg-white border-b border-slate-100">
      <div className="flex items-center gap-2 min-w-max">
        {/* SF Gate (Main) */}
        <button
          onClick={() => setSelectedGate(selectedGate === 'sf' ? 'all' : 'sf')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${
            selectedGate === 'sf'
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
          onClick={() => setSelectedGate(selectedGate === 'jc' ? 'all' : 'jc')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
            selectedGate === 'jc'
              ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="text-sm leading-none">🏛️</span>
          <span>JC Aquino Ave Gate</span>
        </button>

        {/* Morelos Campus */}
        <button
          onClick={() => setSelectedGate(selectedGate === 'morelos' ? 'all' : 'morelos')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all border ${
            selectedGate === 'morelos'
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
          <span>Backup Gen / Solar</span>
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
    </div>
  );
}
