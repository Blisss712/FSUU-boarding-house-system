import React from 'react';
import { X, SlidersHorizontal, ShieldCheck, Zap, Droplets, Wifi, RotateCcw } from 'lucide-react';

export default function FilterModal({
  maxBudget,
  setMaxBudget,
  selectedRoomType,
  setSelectedRoomType,
  genderFilter,
  setGenderFilter,
  floodFreeOnly,
  setFloodFreeOnly,
  powerBackupOnly,
  setPowerBackupOnly,
  boosterPumpOnly,
  setBoosterPumpOnly,
  minWifiSpeed,
  setMinWifiSpeed,
  onResetFilters,
  onClose
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-blue-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Advanced Filters</h3>
              <p className="text-xs text-slate-500">Fine-tune your boarding house preferences</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Max Budget Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs font-bold text-slate-800">
            <span>Max Monthly Budget</span>
            <span className="text-base text-blue-600 font-black">₱{maxBudget.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="1500"
            max="7000"
            step="200"
            value={maxBudget}
            onChange={(e) => setMaxBudget(parseInt(e.target.value))}
            className="w-full accent-blue-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
            <span>₱1,500 (Bedspace)</span>
            <span>₱7,000+ (Luxury Studio)</span>
          </div>
        </div>

        {/* Room Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">Room Accommodation Type</label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {['All', 'Solo Room', 'Bedspace'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedRoomType(t)}
                className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                  selectedRoomType === t
                    ? 'bg-[#0f244a] text-white border-[#0f244a]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Gender / Floor Policy */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">Tenant / Gender Policy</label>
          <div className="grid grid-cols-3 gap-1.5 text-xs">
            {['All', 'Female Only', 'Male Only'].map((g) => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                  genderFilter === g
                    ? 'bg-[#0f244a] text-white border-[#0f244a]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Hyper-Local Verification Must-Haves */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Butuan Climate & Utility Must-Haves:
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-800">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Flood-Safe Street (+2.0m)
            </span>
            <input
              type="checkbox"
              checked={floodFreeOnly}
              onChange={(e) => setFloodFreeOnly(e.target.checked)}
              className="accent-emerald-600 w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-800">
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-600" />
              ANECO Brownout Backup (Solar/Gen)
            </span>
            <input
              type="checkbox"
              checked={powerBackupOnly}
              onChange={(e) => setPowerBackupOnly(e.target.checked)}
              className="accent-amber-600 w-4 h-4 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-800">
            <span className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-600" />
              Overhead Tank + Booster Pump
            </span>
            <input
              type="checkbox"
              checked={boosterPumpOnly}
              onChange={(e) => setBoosterPumpOnly(e.target.checked)}
              className="accent-blue-600 w-4 h-4 rounded"
            />
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={onResetFilters}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 flex items-center justify-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-[#0f244a] hover:bg-[#162a56] text-white font-bold text-xs transition-colors shadow-sm"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </div>
  );
}
