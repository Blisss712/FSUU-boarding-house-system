import React from 'react';
import { Compass, Bookmark, Home, User } from 'lucide-react';

export default function BottomNav({
  activeTab,
  setActiveTab,
  onOpenMap,
  savedCount
}) {
  return (
    <>
      {/* Exact Floating Map View Pill matching mockup */}
      {activeTab === 'explore' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={onOpenMap}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0b1a30] hover:bg-[#152a4d] text-white text-[12.5px] font-black shadow-xl border border-white/10 transition-all hover:scale-102 active:scale-98"
          >
            <span className="text-amber-400 text-sm">📍</span>
            <span>Map View & Proximity</span>
          </button>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex flex-col items-center gap-1 py-1 transition-colors ${
              activeTab === 'explore' ? 'text-[#0b1a30] font-extrabold' : 'text-slate-400 font-medium hover:text-slate-700'
            }`}
          >
            <Compass className={`w-5 h-5 ${activeTab === 'explore' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px]">Explore</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex flex-col items-center gap-1 py-1 transition-colors relative ${
              activeTab === 'saved' ? 'text-[#0b1a30] font-extrabold' : 'text-slate-400 font-medium hover:text-slate-700'
            }`}
          >
            <div className="relative">
              <Bookmark className={`w-5 h-5 ${activeTab === 'saved' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-2 w-3.5 h-3.5 bg-amber-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                  {savedCount}
                </span>
              )}
            </div>
            <span className="text-[11px]">Saved</span>
          </button>

          <button
            onClick={() => setActiveTab('myroom')}
            className={`flex flex-col items-center gap-1 py-1 transition-colors ${
              activeTab === 'myroom' ? 'text-[#0b1a30] font-extrabold' : 'text-slate-400 font-medium hover:text-slate-700'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'myroom' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px]">My Room</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 py-1 transition-colors ${
              activeTab === 'profile' ? 'text-[#0b1a30] font-extrabold' : 'text-slate-400 font-medium hover:text-slate-700'
            }`}
          >
            <User className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px]">Profile</span>
          </button>
        </div>
      </nav>
    </>
  );
}
