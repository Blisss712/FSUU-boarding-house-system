import React from 'react';
import { Compass, Bookmark, Home, User, Building2, ShieldCheck, MessageSquare } from 'lucide-react';

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



  const messagesItem = {
    key: 'messages',
    tab: 'messages',
    icon: MessageSquare,
    label: 'Messages',
  };

  const navItems = isAdmin
    ? [
        { key: 'explore',  tab: 'explore',  icon: Compass,     label: 'Explore' },
        { key: 'audits',   tab: 'audits',   icon: ShieldCheck, label: 'Auditor' },
        messagesItem,
        { key: 'profile',  tab: 'profile',  icon: User,        label: 'Profile' },
      ]
    : isLandlord
    ? [
        { key: 'explore',  tab: 'explore',  icon: Compass,   label: 'Explore' },
        messagesItem,
        { key: 'listings', tab: 'listings', icon: Building2, label: 'My Listings', badge: myListingsCount },
        { key: 'profile',  tab: 'profile',  icon: User,      label: 'Profile' },
      ]
    : [
        { key: 'explore',  tab: 'explore',  icon: Compass,  label: 'Explore' },
        { key: 'saved',    tab: 'saved',    icon: Bookmark, label: 'Saved', badge: savedCount },
        messagesItem,
        { key: 'myroom',   tab: 'myroom',   icon: Home,     label: 'My Room' },
        { key: 'profile',  tab: 'profile',  icon: User,     label: 'Profile' },
      ];

  return (
    <>
      {/* Floating Map View Pill (mobile/tablet only — desktop already shows the sticky map) */}
      {activeTab === 'explore' && (
        <div className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={onOpenMap}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0b1a30] hover:bg-[#152a4d] text-white text-[12.5px] font-black shadow-xl border border-white/10 transition-all hover:scale-[1.03] active:scale-[0.97]"
          >
            <span className="text-amber-400 text-sm">📍</span>
            <span>Map View & Proximity</span>
          </button>
        </div>
      )}

      {/* Bottom Nav Bar — available on every screen size */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-md lg:max-w-2xl mx-auto flex items-stretch justify-between">
          {navItems.map(({ key, tab, icon: Icon, label, badge, onSelect }) => {
            const isActive = !onSelect && activeTab === tab;
            return (
              <button
                key={key}
                onClick={() => {
                  if (onSelect) {
                    onSelect();
                    return;
                  }
                  if (tab === 'explore' && activeTab === 'explore') return;
                  setActiveTab(tab);
                }}
                className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-3 lg:pt-2.5 lg:pb-3.5 relative transition-colors ${
                  isActive ? 'text-[#0b1a30]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {/* Active indicator line */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#0b1a30]" />
                )}

                <div className="relative">
                  <Icon className={`w-5 h-5 lg:w-[21px] lg:h-[21px] transition-all duration-150 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {/* Badge for saved / listings */}
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-amber-500 text-slate-950 rounded-full text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[11px] lg:text-xs ${isActive ? 'font-extrabold' : 'font-medium'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
