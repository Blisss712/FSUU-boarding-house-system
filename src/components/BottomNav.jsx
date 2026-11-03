import React from 'react';
import { Compass, Bookmark, Home, User, Building2, ShieldCheck } from 'lucide-react';

export default function BottomNav({
  activeTab,
  setActiveTab,
  onOpenMap,
  savedCount,
  user,
  myListingsCount = 0
}) {
  const isLandlord = user?.role === 'landlord';
  const isAdmin = user?.role === 'admin' || Boolean(user?.isAdmin);

  const navItems = isAdmin
    ? [
        { tab: 'explore',  icon: Compass,     label: 'Explore' },
        { tab: 'audits',   icon: ShieldCheck, label: 'Auditor' },
        { tab: 'profile',  icon: User,        label: 'Profile' },
      ]
    : isLandlord
    ? [
        { tab: 'explore',  icon: Compass,   label: 'Explore' },
        { tab: 'listings', icon: Building2, label: 'My Listings', badge: myListingsCount },
        { tab: 'profile',  icon: User,      label: 'Profile' },
      ]
    : [
        { tab: 'explore', icon: Compass,  label: 'Explore' },
        { tab: 'saved',   icon: Bookmark, label: 'Saved', badge: savedCount },
        { tab: 'myroom',  icon: Home,     label: 'My Room' },
        { tab: 'profile', icon: User,     label: 'Profile' },
      ];

  return (
    <>
      {/* Floating Map View Pill */}
      {activeTab === 'explore' && (
        <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={onOpenMap}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0b1a30] hover:bg-[#152a4d] text-white text-[12.5px] font-black shadow-xl border border-white/10 transition-all hover:scale-[1.03] active:scale-[0.97]"
          >
            <span className="text-amber-400 text-sm">📍</span>
            <span>Map View & Proximity</span>
          </button>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-md mx-auto flex items-stretch justify-between">
          {navItems.map(({ tab, icon: Icon, label, badge }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => tab === 'explore' && activeTab === 'explore' ? null : setActiveTab(tab)}
                className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-3 relative transition-colors ${
                  isActive ? 'text-[#0b1a30]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {/* Active indicator line */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#0b1a30]" />
                )}

                <div className="relative">
                  <Icon className={`w-5 h-5 transition-all duration-150 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {/* Badge for saved / listings count */}
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] ${isActive ? 'font-extrabold' : 'font-medium'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
