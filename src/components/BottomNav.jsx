import React from 'react';
import { Compass, Bookmark, Home, User, MapPin } from 'lucide-react';

export default function BottomNav({
  activeTab,
  setActiveTab,
  onOpenMap,
  savedCount
}) {
  return (
    <>
      {/* Floating Map Pill Button */}
      {activeTab === 'explore' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={onOpenMap}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0a1835] hover:bg-[#102450] text-white text-xs font-black shadow-xl border border-white/20 backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Map View & Proximity</span>
          </button>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex flex-col items-center gap-1 py-1 transition-colors ${
              activeTab === 'explore' ? 'text-blue-900 font-extrabold' : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
          >
            <Compass className={`w-5 h-5 ${activeTab === 'explore' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px]">Explore</span>
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`flex flex-col items-center gap-1 py-1 transition-colors relative ${
              activeTab === 'saved' ? 'text-blue-900 font-extrabold' : 'text-slate-500 font-medium hover:text-slate-800'
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
              activeTab === 'myroom' ? 'text-blue-900 font-extrabold' : 'text-slate-500 font-medium hover:text-slate-800'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'myroom' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            <span className="text-[11px]">My Room</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 py-1 transition-colors ${
              activeTab === 'profile' ? 'text-blue-900 font-extrabold' : 'text-slate-500 font-medium hover:text-slate-800'
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
