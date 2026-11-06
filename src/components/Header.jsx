import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, MapPin, Building2, LogOut, LogIn, UserPlus, X, Sparkles } from 'lucide-react';
import SearchRecommendationsDropdown from './SearchRecommendationsDropdown';

export default function Header({
  searchQuery,
  setSearchQuery,
  openFilterModal,
  activeFilterCount,
  setActiveTab,
  // Auth props
  user,
  onLogin,
  onSignup,
  onLogout,
  // Search data props
  properties = [],
  availableAmenities = [],
  onSelectProperty,
  // AI needs search (sparkles button + dropdown entry point)
  onOpenAiSearch
}) {
  const [showSearchRecs, setShowSearchRecs] = useState(false);
  const [showMobileSearchRecs, setShowMobileSearchRecs] = useState(false);
  const searchContainerRef = useRef(null);
  const mobileSearchContainerRef = useRef(null);

  // Handle click outside & escape key to close recommendation popovers
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchRecs(false);
      }
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(event.target)) {
        setShowMobileSearchRecs(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setShowSearchRecs(false);
        setShowMobileSearchRecs(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-8 py-3 shadow-2xs">
      <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-3 shrink-0">
          <div 
            onClick={() => setActiveTab('explore')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#0b1a30] flex items-center justify-center text-amber-400 shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <Building2 className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[17px] text-[#0b1a30] tracking-tight leading-none">
                  Balay Urios
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a] leading-none">
                  FSUU MAIN
                </span>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-slate-500 font-medium mt-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Main Campus · Butuan City</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Desktop Search */}
        <div ref={searchContainerRef} className="flex-1 max-w-2xl hidden md:flex items-center gap-2 relative">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowSearchRecs(true)}
              onClick={() => setShowSearchRecs(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchRecs(true);
              }}
              placeholder="Search pad, zone, amenity (Aircon, Desk, Water) or checklist (Solar, Booster)..."
              className={`w-full pl-9 pr-9 py-2.5 text-xs rounded-2xl focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium ${
                showSearchRecs
                  ? 'border-[#0b1a30] ring-2 ring-[#0b1a30]/20 bg-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100/70 border border-slate-200'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchRecs(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Desktop Recommendations Dropdown */}
            {showSearchRecs && (
              <SearchRecommendationsDropdown
                searchQuery={searchQuery}
                onSelectQuery={(q) => {
                  setSearchQuery(q);
                  setShowSearchRecs(false);
                }}
                onSelectProperty={(p) => {
                  setShowSearchRecs(false);
                  onSelectProperty?.(p);
                }}
                properties={properties}
                availableAmenities={availableAmenities}
                onClose={() => setShowSearchRecs(false)}
                onOpenFilters={openFilterModal}
                onAskAi={(text) => {
                  setShowSearchRecs(false);
                  onOpenAiSearch?.(text);
                }}
              />
            )}
          </div>

          {/* AI needs search: describe the pad you need in one sentence */}
          <button
            type="button"
            onClick={() => {
              setShowSearchRecs(false);
              onOpenAiSearch?.(searchQuery);
            }}
            title="AI Needs Search — describe what you need and let AI list your needs"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-700 hover:from-violet-700 hover:to-blue-800 text-white text-xs font-extrabold shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>AI</span>
          </button>

          <button
            onClick={openFilterModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-bold transition-all shadow-xs shrink-0 relative cursor-pointer"
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

        {/* Right: Nav + Auth */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Filter Button */}
          <button
            onClick={openFilterModal}
            className="md:hidden w-9 h-9 rounded-xl bg-[#0b1a30] text-white flex items-center justify-center relative shadow-xs shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center ring-2 ring-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* ── Auth zone ──────────────────────────────────────────── */}
          {user ? (
            /* Logged-in: avatar + name + logout */
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
              <button
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 group cursor-pointer"
                title={`${user.name} (${user.role}) — View Profile`}
              >
                {/* Avatar initials circle */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ring-2 ring-offset-1 ${
                  user.role === 'admin'
                    ? 'bg-purple-700 ring-purple-500'
                    : user.role === 'landlord'
                    ? 'bg-amber-500 ring-amber-400'
                    : 'bg-[#0b1a30] ring-[#0b1a30]'
                }`}>
                  {user.avatarInitials || user.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user.name.split(' ')[0]}</p>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${
                    user.role === 'admin' ? 'text-purple-700' : user.role === 'landlord' ? 'text-amber-600' : 'text-blue-600'
                  }`}>
                    {user.role === 'admin' ? 'Auditor' : user.role}
                  </p>
                </div>
              </button>

              <button
                onClick={onLogout}
                title="Log out"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Logged-out: Login + Sign Up buttons */
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200">
              <button
                onClick={onLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log In</span>
              </button>
              <button
                onClick={onSignup}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#0b1a30] text-white hover:bg-[#1a3a6b] transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Up</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-Only Search Row */}
      <div ref={mobileSearchContainerRef} className="md:hidden mt-2.5 relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setShowMobileSearchRecs(true)}
              onClick={() => setShowMobileSearchRecs(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowMobileSearchRecs(true);
              }}
              placeholder="Search pad, amenities (Aircon, Desk) or checklist..."
              className={`w-full pl-9 pr-8 py-2 text-xs rounded-xl focus:outline-none transition-all text-slate-900 placeholder:text-slate-400 ${
                showMobileSearchRecs
                  ? 'border-[#0b1a30] ring-2 ring-[#0b1a30]/20 bg-white shadow-sm'
                  : 'bg-slate-50 border border-slate-200'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowMobileSearchRecs(true);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* AI needs search (mobile) */}
          <button
            type="button"
            onClick={() => {
              setShowMobileSearchRecs(false);
              onOpenAiSearch?.(searchQuery);
            }}
            title="AI Needs Search"
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-blue-700 text-white flex items-center justify-center shadow-sm shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
          </button>
        </div>

        {/* Mobile Recommendations Dropdown */}
        {showMobileSearchRecs && (
          <SearchRecommendationsDropdown
            searchQuery={searchQuery}
            onSelectQuery={(q) => {
              setSearchQuery(q);
              setShowMobileSearchRecs(false);
            }}
            onSelectProperty={(p) => {
              setShowMobileSearchRecs(false);
              onSelectProperty?.(p);
            }}
            properties={properties}
            availableAmenities={availableAmenities}
            onClose={() => setShowMobileSearchRecs(false)}
            onOpenFilters={openFilterModal}
            onAskAi={(text) => {
              setShowMobileSearchRecs(false);
              onOpenAiSearch?.(text);
            }}
          />
        )}
      </div>
    </header>
  );
}
