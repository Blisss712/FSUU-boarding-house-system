import React from 'react';
import { 
  Check, 
  Award, 
  CloudSun,
  ShieldCheck, 
  Droplets, 
  Zap, 
  Signal, 
  Wifi, 
  SlidersHorizontal 
} from 'lucide-react';

const PILLS = [
  { key: 'rainOrShineOnly', Icon: CloudSun,    label: 'Good Condition (Rain/Shine)', color: 'amber'   },
  { key: 'floodFreeOnly',   Icon: ShieldCheck, label: 'Flood-Safe Zone',             color: 'emerald' },
  { key: 'boosterPumpOnly', Icon: Droplets,    label: 'Water Booster',               color: 'sky'     },
  { key: 'powerBackupOnly', Icon: Zap,         label: 'Brownout Backup',             color: 'amber'   },
  { key: 'mobile5GOnly',    Icon: Signal,      label: '5G Signal',                   color: 'rose'    },
  { key: 'fastWifiOnly',    Icon: Wifi,        label: '50+ Mbps Wi-Fi',              color: 'indigo'  },
];

const COLOR_MAP = {
  blue:    { on: 'text-blue-300',    off: 'text-blue-600' },
  emerald: { on: 'text-emerald-300', off: 'text-emerald-600' },
  sky:     { on: 'text-sky-300',     off: 'text-sky-600' },
  amber:   { on: 'text-amber-300 fill-amber-300', off: 'text-amber-500 fill-amber-500' },
  rose:    { on: 'text-rose-300',    off: 'text-rose-600' },
  indigo:  { on: 'text-indigo-300',  off: 'text-indigo-500' },
};

export default function VerificationBanner({
  rainOrShineOnly, setRainOrShineOnly,
  walkOnly, setWalkOnly,
  floodFreeOnly, setFloodFreeOnly,
  powerBackupOnly, setPowerBackupOnly,
  boosterPumpOnly, setBoosterPumpOnly,
  fastWifiOnly, setFastWifiOnly,
  mobile5GOnly, setMobile5GOnly,
  onOpenAdvancedFilter,
  activeFilterCount = 0
}) {
  const activeCondition = rainOrShineOnly ?? walkOnly ?? false;
  const setCondition = setRainOrShineOnly ?? setWalkOnly;

  const values = { 
    rainOrShineOnly: activeCondition, 
    floodFreeOnly, 
    boosterPumpOnly, 
    powerBackupOnly, 
    mobile5GOnly, 
    fastWifiOnly 
  };
  const setters = {
    rainOrShineOnly: setCondition,
    floodFreeOnly: setFloodFreeOnly,
    boosterPumpOnly: setBoosterPumpOnly,
    powerBackupOnly: setPowerBackupOnly,
    mobile5GOnly: setMobile5GOnly,
    fastWifiOnly: setFastWifiOnly,
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[#eff6ff] via-[#f0f7ff] to-white border border-blue-200/90 shadow-sm relative overflow-hidden transition-all">
      {/* Subtle Rosette Watermark */}
      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none text-blue-900">
        <Award className="w-32 h-32" />
      </div>

      <div className="relative z-10 space-y-3.5">
        {/* Top Header Row */}
        <div className="flex items-start gap-3">
          {/* Verified Green Shield Rosette */}
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-[#047857] flex items-center justify-center shrink-0 text-white shadow-xs">
            <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
          </div>

          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-[13px] sm:text-sm font-black text-[#0b1a30] leading-snug tracking-tight">
                The Student Reality Checklist • 100% Urios Student Audited
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wide shrink-0">
                6-POINT AUDIT
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed mt-1 font-medium">
              Verified building condition (rain or shine), flood-safe street elevation, 24/7 booster water pressure, solar brownout resilience, in-room mobile data (DITO, Smart, Globe), and fiber Wi-Fi speeds.
            </p>
          </div>
        </div>

        {/* Integrated Filter Pills & More Filters Button */}
        <div className="pt-2 border-t border-blue-200/70">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900/80">
              Filter by Verified Audits:
            </span>
            {onOpenAdvancedFilter && (
              <button
                type="button"
                onClick={onOpenAdvancedFilter}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-[11px] font-bold transition-all border border-blue-200 shadow-2xs cursor-pointer shrink-0"
              >
                <SlidersHorizontal className="w-3 h-3 text-amber-500" />
                <span>More Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {PILLS.map(({ key, Icon, label, color }) => {
              const active = values[key];
              const c = COLOR_MAP[color];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setters[key]?.(!active)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                    active
                      ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs scale-[1.02]'
                      : 'bg-white hover:bg-blue-50/70 text-slate-700 border-blue-200 hover:border-blue-300 shadow-2xs'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? c.on : c.off}`} />
                  <span>{label}</span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
