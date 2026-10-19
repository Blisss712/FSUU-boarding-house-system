import React from 'react';
import { X, SlidersHorizontal, ShieldCheck, Zap, Droplets, RotateCcw, Check, Building, MapPin } from 'lucide-react';
import { CAMPUSES, BUTUAN_ZONES } from '../data/boardingHouses';

export default function HierarchicalFilterModal({
  selectedCampus,
  setSelectedCampus,
  selectedGate,
  setSelectedGate,
  selectedZone,
  setSelectedZone,
  maxBudget,
  setMaxBudget,
  selectedRoomType,
  setSelectedRoomType,
  floodFreeOnly,
  setFloodFreeOnly,
  powerBackupOnly,
  setPowerBackupOnly,
  boosterPumpOnly,
  setBoosterPumpOnly,
  matchingCount,
  onResetFilters,
  onClose
}) {
  const activeCampus = CAMPUSES.find(c => c.id === selectedCampus) || CAMPUSES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0b1a30] text-amber-400 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-[#0b1a30]">Filter Boarding Houses</h3>
              <p className="text-[11px] text-slate-400 font-medium">Campus gates, zones, & climate safety</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Campus Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0b1a30] flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>Target University Campus</span>
          </label>
          <select
            value={selectedCampus}
            onChange={(e) => {
              setSelectedCampus(e.target.value);
              setSelectedGate('all');
            }}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b1a30]"
          >
            <option value="all">All Butuan Campuses</option>
            <option value="fsuu-main">FSUU Main Campus (San Francisco & JC Aquino)</option>
            <option value="fsuu-morelos">FSUU Morelos Campus (Libertad)</option>
          </select>
        </div>

        {/* 2. Specific Gate Selector (Hierarchical) */}
        {selectedCampus !== 'all' && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0b1a30]">Nearest Campus Gate</label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                onClick={() => setSelectedGate('all')}
                className={`p-2 rounded-xl font-bold border transition-all text-center ${
                  selectedGate === 'all'
                    ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Any Gate
              </button>
              {activeCampus.gates.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGate(g.id)}
                  className={`p-2 rounded-xl font-bold border transition-all text-center truncate ${
                    selectedGate === g.id
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {g.shortName}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Butuan Neighborhood / Zone Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0b1a30] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Butuan Subdivision / Zone</span>
          </label>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {BUTUAN_ZONES.map((zone) => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-3 py-1.5 rounded-xl font-semibold border transition-all ${
                  selectedZone === zone
                    ? 'bg-[#0b1a30] text-white border-[#0b1a30]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Monthly Budget Slider */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex justify-between items-center text-xs font-bold">
            <span className="text-slate-700">Max Monthly Budget</span>
            <span className="text-base text-[#0b1a30] font-black">₱{maxBudget.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="1500"
            max="7000"
            step="200"
            value={maxBudget}
            onChange={(e) => setMaxBudget(parseInt(e.target.value))}
            className="w-full accent-[#0b1a30] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>₱1,500 (Bedspace)</span>
            <span>₱7,000+ (Studio Suite)</span>
          </div>
        </div>

        {/* 5. Climate & Infrastructure Must-Haves */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
            Verified Climate & Utility Standards:
          </p>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-bold text-slate-800">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Certified Flood-Safe Street (+2.0m)</span>
            </span>
            <input
              type="checkbox"
              checked={floodFreeOnly}
              onChange={(e) => setFloodFreeOnly(e.target.checked)}
              className="accent-emerald-600 w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-bold text-slate-800">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              <span>ANECO Brownout Backup (Solar/Gen)</span>
            </span>
            <input
              type="checkbox"
              checked={powerBackupOnly}
              onChange={(e) => setPowerBackupOnly(e.target.checked)}
              className="accent-amber-600 w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-bold text-slate-800">
            <span className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              <span>Overhead Tank + Booster Pump</span>
            </span>
            <input
              type="checkbox"
              checked={boosterPumpOnly}
              onChange={(e) => setBoosterPumpOnly(e.target.checked)}
              className="accent-blue-600 w-4 h-4 rounded"
            />
          </label>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={onResetFilters}
            className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-[#0b1a30] hover:bg-[#152a4d] text-white font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Show {matchingCount} Inspected Pads</span>
          </button>
        </div>
      </div>
    </div>
  );
}
