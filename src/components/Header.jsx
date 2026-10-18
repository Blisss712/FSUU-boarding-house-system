import React from 'react';
import { Search, SlidersHorizontal, Bell, Bookmark, Building2, MapPin, Smartphone, Monitor } from 'lucide-react';

export default function Header({
  searchQuery,
  setSearchQuery,
  openFilterModal,
  activeFilterCount,
  isMobileFrame,
  setIsMobileFrame,
  openSmsBotModal,
  openMapModal,
  savedCount
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
      <div className="max-w-4xl mx-auto">
        {/* Top bar with branding and status */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-blue-700 flex items-center justify-center text-white shadow-sm shadow-amber-500/20">
              <Building2 className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-900">Balay Urios</span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                  FSUU HUB
                </span>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-slate-500 font-medium">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Butuan City, ADN</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle */}
            <button
              onClick={() => setIsMobileFrame(!isMobileFrame)}
              title={isMobileFrame ? "Switch to Full Layout" : "Switch to Mobile Phone View"}
              className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            >
              {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            </button>

            {/* Landlord SMS Bot Demo Trigger */}
            <button
              onClick={openSmsBotModal}
              title="Test Landlord SMS 1-Tap Vacancy Bot"
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="hidden sm:inline">SMS Bot Demo</span>
              <span className="sm:hidden">Bot</span>
            </button>

            <button
              onClick={openMapModal}
              title="View Butuan Map"
              className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-600" />
            </button>

            <div className="relative">
              <button
                className="p-2 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors"
              >
                <Bookmark className="w-4 h-4 text-slate-600" />
              </button>
              {savedCount > 0 && (
                <span className="absolute 1 top-1 right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search near San Francisco St., JC Aquino..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={openFilterModal}
            className={`p-2.5 rounded-xl border flex items-center justify-center relative transition-all ${
              activeFilterCount > 0
                ? 'bg-blue-950 text-white border-blue-900 shadow-sm'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Open Advanced Filters"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
