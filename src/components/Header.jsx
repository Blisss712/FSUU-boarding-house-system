import React from 'react';
import { Search, SlidersHorizontal, Bell, Bookmark, MapPin, Building2, User, Bot, Compass, Home } from 'lucide-react';

export default function Header({
  searchQuery,
  setSearchQuery,
  selectedCampus,
  setSelectedCampus,
  openFilterModal,
  activeFilterCount,
  savedCount,
  activeTab,
  setActiveTab,
  onOpenSmsBot
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 shadow-2xs">
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Branding & Location */}
        <div className="flex items-center gap-3 shrink-0">
          <div 
            onClick={() => setActiveTab('explore')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            {/* Balay Urios Navy & Gold Icon */}
            <div className="w-10 h-10 rounded-2xl bg-[#0b1a30] flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <Building2 className="w-5 h-5 text-amber-400" />
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
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Butuan City, ADN</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Desktop Search & Quick Campus Selector (Hidden on small mobile, visible on tablet/desktop) */}
        <div className="flex-1 max-w-2xl hidden md:flex items-center gap-2">
          {/* Campus Selector Dropdown */}
          <div className="relative shrink-0">
            <select
              value={selectedCampus}
              onChange={(e) => setSelectedCampus(e.target.value)}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold rounded-2xl px-3 py-2.5 focus:outline-none focus:border-[#0b1a30] cursor-pointer pr-7"
            >
              <option value="all">All Butuan</option>
              <option value="fsuu-main">FSUU Main (SF & JC)</option>
              <option value="fsuu-morelos">FSUU Morelos (Libertad)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by street (San Francisco St., Guingona, Montilla, R. Calo)..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-[#0b1a30] focus:ring-1 focus:ring-[#0b1a30] transition-all text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Advanced Filter Button */}
          <button
            onClick={openFilterModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-bold transition-all shadow-xs shrink-0 relative"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center ml-1">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Right: Desktop Navigation Links & Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Desktop Nav Links */}
          <div className="hidden lg:flex items-center gap-1 border-r border-slate-200 pr-3">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'explore'
                  ? 'bg-blue-50 text-blue-900 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Explore
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors relative ${
                activeTab === 'saved'
                  ? 'bg-blue-50 text-blue-900 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Saved
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-black">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('myroom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                activeTab === 'myroom'
                  ? 'bg-blue-50 text-blue-900 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              My Tenancy
            </button>
          </div>

          {/* SMS Bot Demo Trigger */}
          <button
            onClick={onOpenSmsBot}
            className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
            title="Simulate 1-Tap SMS Vacancy Bot for Landlords"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">SMS Vacancy Bot</span>
            <span className="sm:hidden">Bot</span>
          </button>

          {/* Mobile Filter Button (Visible on mobile only) */}
          <button
            onClick={openFilterModal}
            className="md:hidden w-9 h-9 rounded-xl bg-[#0b1a30] text-white flex items-center justify-center relative shadow-xs shrink-0"
            title="Filter options"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center ring-2 ring-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Notification Icon */}
          <button 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-slate-700" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white"></span>
          </button>

          {/* Saved Bookmark Icon */}
          <button 
            onClick={() => setActiveTab('saved')}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative"
            title="Saved Boarding Houses"
          >
            <Bookmark className="w-4 h-4 text-slate-700" />
            {savedCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center ring-2 ring-white">
                {savedCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <div 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 pl-1 cursor-pointer"
          >
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
              alt="Urian Student"
              className="w-8 h-8 rounded-full object-cover border-2 border-slate-200 hover:border-[#0b1a30] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Mobile-Only Search Row (Shown under header on mobile screens) */}
      <div className="md:hidden mt-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search near San Francisco St., JC Aquino..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0b1a30] text-slate-900 placeholder:text-slate-400"
          />
        </div>
      </div>
    </header>
  );
}
