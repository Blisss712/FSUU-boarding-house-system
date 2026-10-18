import React from 'react';
import { Footprints, ShieldCheck, Zap, Droplets, GraduationCap, School } from 'lucide-react';

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
        {/* Gate Chips */}
        <button
          onClick={() => setSelectedGate(selectedGate === 'sf' ? 'all' : 'sf')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            selectedGate === 'sf'
              ? 'bg-[#0f1d39] text-white border-[#0f1d39] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Footprints className="w-3.5 h-3.5 text-amber-400" />
          <span>SF Gate (Main)</span>
          <span className="text-[10px] opacity-75">▾</span>
        </button>

        <button
          onClick={() => setSelectedGate(selectedGate === 'jc' ? 'all' : 'jc')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            selectedGate === 'jc'
              ? 'bg-[#0f1d39] text-white border-[#0f1d39] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <School className="w-3.5 h-3.5 text-blue-500" />
          <span>JC Aquino Ave Gate</span>
        </button>

        <button
          onClick={() => setSelectedGate(selectedGate === 'morelos' ? 'all' : 'morelos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            selectedGate === 'morelos'
              ? 'bg-[#0f1d39] text-white border-[#0f1d39] shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
          <span>Morelos Campus</span>
        </button>

        {/* Hyper-Local Value Chips */}
        <button
          onClick={() => setFloodFreeOnly(!floodFreeOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            floodFreeOnly
              ? 'bg-emerald-900 text-emerald-50 border-emerald-900 shadow-xs ring-1 ring-emerald-500/30'
              : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Flood-Free Path</span>
        </button>

        <button
          onClick={() => setPowerBackupOnly(!powerBackupOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            powerBackupOnly
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
              : 'bg-amber-50/70 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          <span>Backup Gen / Solar</span>
        </button>

        <button
          onClick={() => setBoosterPumpOnly(!boosterPumpOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            boosterPumpOnly
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
              : 'bg-blue-50/70 text-blue-800 border-blue-200 hover:bg-blue-100'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-blue-500" />
          <span>Booster Pump</span>
        </button>
      </div>
    </div>
  );
}
