import React from 'react';
import { BadgeCheck, ShieldAlert } from 'lucide-react';

export default function VerificationBanner({ onLearnMore }) {
  return (
    <div className="mx-4 my-3 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/60 to-blue-50 border border-emerald-200/80 shadow-xs relative overflow-hidden">
      <div className="flex items-start gap-3 relative z-10">
        <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center shrink-0 text-white shadow-sm shadow-emerald-600/30">
          <BadgeCheck className="w-5 h-5 text-emerald-100" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">
              100% In-Person Inspected by Urian Volunteers
            </h4>
          </div>
          <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
            WiFi speedtest, Agusan flood elevation, and landlord booster water pressure verified on-site this semester.
          </p>
        </div>
      </div>

      {/* Decorative watermark badge */}
      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none text-emerald-800">
        <BadgeCheck className="w-24 h-24" />
      </div>
    </div>
  );
}
