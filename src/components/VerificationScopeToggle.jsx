import React from 'react';
import { BadgeCheck, LayoutList } from 'lucide-react';

const OPTIONS = [
  {
    id: 'all',
    label: 'All listings',
    Icon: LayoutList,
    hint: 'Every boarding house landlords have posted, audited or not.'
  },
  {
    id: 'verified',
    label: 'Urios Verified',
    Icon: BadgeCheck,
    hint: 'Only pads inspected and badged by the FSUU housing committee.'
  }
];

/**
 * VerificationScopeToggle
 * Segmented control in the Explore feed that switches between every posted
 * listing and only the pads badged "Urios Verified".
 *
 * Props:
 *   scope    — 'all' | 'verified'
 *   counts   — { all, verified } totals shown on each option
 *   onChange — (nextScope) => void
 */
export default function VerificationScopeToggle({ scope = 'all', counts = { all: 0, verified: 0 }, onChange }) {
  const active = OPTIONS.find(option => option.id === scope) || OPTIONS[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="group"
        aria-label="Filter listings by Urios verification"
        className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200"
      >
        {OPTIONS.map(({ id, label, Icon }) => {
          const isActive = scope === id;
          const value = id === 'verified' ? counts?.verified ?? 0 : counts?.all ?? 0;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange?.(id)}
              aria-pressed={isActive}
              title={id === 'verified' ? 'Show only Urios Verified pads' : 'Show every posted boarding house'}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-[11.5px] font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#0b1a30] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#0b1a30] hover:bg-white/70'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${
                isActive ? 'text-amber-400' : id === 'verified' ? 'text-emerald-600' : 'text-slate-400'
              }`} />
              <span className="whitespace-nowrap">{label}</span>
              <span className={`min-w-5 h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                isActive
                  ? 'bg-white/15 text-white'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}>
                {value}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 font-medium">
        {active.hint}
      </p>
    </div>
  );
}
