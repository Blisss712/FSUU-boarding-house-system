import React from 'react';
import { Search, SlidersHorizontal, Bell, Bookmark, MapPin } from 'lucide-react';

export default function Header({
  searchQuery,
  setSearchQuery,
  openFilterModal,
  activeFilterCount,
  savedCount,
  onOpenSaved
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 pt-3.5 pb-2.5 border-b border-slate-100">
      {/* Top Branding Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* Exact Balay Urios App Icon */}
          <div className="w-10 h-10 rounded-2xl bg-[#0b1a30] flex items-center justify-center text-amber-400 shadow-sm shrink-0">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 2H5c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 2h2v2h-2V4zm0 4h2v2h-2V8zm0 4h2v2h-2v-2zm-4-8h2v2H8V4zm0 4h2v2H8V8zm0 4h2v2H8v-2zm-1 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V8h2v2zm0-4H5V4h2v2zm12 12h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V8h2v2zm0-4h-2V4h2v2zm-3 12h-2v-4h2v4z"/>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-[17px] text-[#0b1a30] tracking-tight leading-none">
                Balay Urios
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a] leading-none">
                FSUU HUB
              </span>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-slate-500 font-medium mt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Butuan City, ADN</span>
            </div>
          </div>
        </div>

        {/* Right Notification & Bookmark Actions */}
        <div className="flex items-center gap-2">
          {/* Notification Bell with Orange Dot */}
          <button 
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-slate-700 stroke-[1.8]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
          </button>

          {/* Bookmark Ribbon */}
          <button 
            onClick={onOpenSaved}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 transition-colors relative"
            title="Saved Boarding Houses"
          >
            <Bookmark className="w-5 h-5 text-slate-700 stroke-[1.8]" />
            {savedCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search Input Row with Filter Button */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search near San Francisco St., JC Aquino..."
            className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-[#0b1a30] focus:ring-1 focus:ring-[#0b1a30] transition-all text-slate-900 placeholder:text-slate-400 shadow-2xs"
          />
        </div>

        {/* Dark Navy Filter Button with Badge */}
        <button
          onClick={openFilterModal}
          className="w-11 h-11 rounded-2xl bg-[#0b1a30] hover:bg-[#152a4d] text-white flex items-center justify-center relative transition-all shadow-xs shrink-0"
          title="Filter options"
        >
          <SlidersHorizontal className="w-4 h-4 text-white stroke-[2.2]" />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
            {activeFilterCount > 0 ? activeFilterCount : 3}
          </span>
        </button>
      </div>
    </header>
  );
}
