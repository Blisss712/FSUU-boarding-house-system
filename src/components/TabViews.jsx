import React from 'react';
import { Bookmark, Home, User, ShieldCheck, Clock, FileText, Zap, Award, Bell } from 'lucide-react';
import PropertyCard from './PropertyCard';

export function SavedView({ savedProperties, onSelectProperty, onToggleSave, onOpenCostCalc, onOpenWalkPov }) {
  if (savedProperties.length === 0) {
    return (
      <div className="p-8 text-center max-w-sm mx-auto my-12 space-y-3">
        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Bookmark className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-base text-slate-800">No Saved Pads Yet</h3>
        <p className="text-xs text-slate-500">
          Tap the heart icon on any boarding house to compare walking distance, flood ratings, and true monthly rent.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-base text-slate-900">Saved Pads ({savedProperties.length})</h2>
      </div>
      <div className="space-y-4">
        {savedProperties.map(p => (
          <PropertyCard
            key={p.id}
            property={p}
            onSelectProperty={onSelectProperty}
            isSaved={true}
            onToggleSave={onToggleSave}
            onOpenCostCalc={onOpenCostCalc}
            onOpenWalkPov={onOpenWalkPov}
          />
        ))}
      </div>
    </div>
  );
}

export function MyRoomView() {
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
      <div className="p-4 rounded-3xl bg-gradient-to-br from-[#0f244a] to-blue-950 text-white shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">
            Current Tenancy Pass • 1st Sem 2026-2027
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
            Active Tenant
          </span>
        </div>

        <div>
          <h3 className="text-lg font-black text-white">Villa Guingona Student Pad</h3>
          <p className="text-xs text-blue-200">Room 204 • Submeter #1892</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs">
            <p className="text-[10px] text-blue-300">Submeter Electric</p>
            <p className="font-extrabold text-white">42 kWh (₱588)</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-xs">
            <p className="text-[10px] text-blue-300">Next Rent Due</p>
            <p className="font-extrabold text-amber-300">Nov 05, 2026</p>
          </div>
        </div>
      </div>

      {/* Digital Curfew Pass Slip */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            Request Overnight / Hospital Duty Slip
          </h4>
          <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-200">
            Digital Pass
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Late hospital duty or thesis work? Send a digital notice directly to the landlady and resident caretaker.
        </p>
        <button className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors">
          Submit Curfew Exemption Notice
        </button>
      </div>

      {/* Recent Receipts & Escrow */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
        <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-blue-600" />
          Verified Official Rent Receipts
        </h4>
        <div className="space-y-1.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">October 2026 Monthly Rent</p>
              <p className="text-[10px] text-slate-500">Paid Oct 04, 2026 via GCash Escrow</p>
            </div>
            <span className="font-black text-slate-900">₱3,800</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileView() {
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
      <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center font-black text-blue-900 text-lg">
          JD
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-extrabold text-base text-slate-900">John Reymond Diaz</h3>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
              Urian Verified
            </span>
          </div>
          <p className="text-xs text-slate-500">jrdiaz@urios.edu.ph • BS Nursing 3rd Year</p>
          <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">
            ✓ Student ID & Parent Contact Verified
          </p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 text-xs">
        <h4 className="font-bold text-slate-900">Parent Emergency Contacts</h4>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
          <p className="font-bold text-slate-800">Maria Diaz (Mother)</p>
          <p className="text-slate-500 font-mono text-[11px]">+63 917 234 5678 • Surigao City</p>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1">
        <p className="font-bold flex items-center gap-1">
          <Award className="w-4 h-4 text-amber-700" />
          FSUU Student Council Housing Partner
        </p>
        <p className="text-[11px] leading-relaxed">
          Balay Urios works closely with FSUU Student Affairs & Supreme Student Government (SSG) to ensure all off-campus boarding facilities meet safety, sanitation, and flood security requirements.
        </p>
      </div>
    </div>
  );
}
