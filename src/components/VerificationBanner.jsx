import React from 'react';
import { Check, Award } from 'lucide-react';

export default function VerificationBanner() {
  return (
    <div className="mx-4 my-3 p-3.5 rounded-2xl bg-[#eff6ff] border border-[#dbeafe] relative overflow-hidden">
      <div className="flex items-start gap-3 relative z-10">
        {/* Verified Green Shield Rosette */}
        <div className="w-8 h-8 rounded-full bg-[#047857] flex items-center justify-center shrink-0 text-white shadow-xs">
          <Check className="w-4 h-4 stroke-[3]" />
        </div>

        <div className="flex-1 pr-4">
          <h4 className="text-[13px] font-extrabold text-[#0b1a30] leading-snug tracking-tight">
            100% In-Person Inspected by Urian Volunteers
          </h4>
          <p className="text-[11px] text-slate-500 leading-normal mt-0.5 font-medium">
            WiFi speedtest, Agusan flood elevation, and landlord booster water pressure verified on-site this semester.
          </p>
        </div>
      </div>

      {/* Rosette Watermark */}
      <div className="absolute -right-3 -bottom-3 opacity-15 pointer-events-none text-blue-900">
        <Award className="w-20 h-20" />
      </div>
    </div>
  );
}
