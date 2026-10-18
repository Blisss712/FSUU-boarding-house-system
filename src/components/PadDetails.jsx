import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MoreVertical, 
  Share2, 
  CheckCircle2, 
  ShieldCheck, 
  Wifi, 
  Droplets, 
  Zap, 
  Footprints, 
  Star, 
  MessageCircle, 
  Calendar, 
  Clock, 
  Users, 
  Volume2, 
  Shirt, 
  Lock, 
  Check, 
  Signal, 
  Video, 
  Calculator,
  Compass,
  Building2,
  ChevronRight
} from 'lucide-react';

export default function PadDetails({ 
  property, 
  onBack, 
  onOpenCostCalc, 
  onOpenWalkPov, 
  onOpenParentShare,
  onOpenScheduleVisit,
  onOpenChat
}) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  if (!property) return null;

  const {
    name,
    area,
    roomType,
    gender,
    price,
    priceSubtext,
    advanceDeposit,
    minContract,
    rating,
    reviewCount,
    landlord,
    images,
    floodRating,
    waterSystem,
    powerSystem,
    wifiAudit,
    commuteSteps,
    amenities,
    rules
  } = property;

  return (
    <div className="bg-white min-h-screen pb-32">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 -ml-1 text-slate-800 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#0b1a30] flex items-center justify-center text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-[15px] text-[#0b1a30]">Pad Details</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Share with Parents trigger */}
          <button
            onClick={() => onOpenParentShare(property)}
            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold flex items-center gap-1 border border-blue-200"
            title="Share with Parents"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button className="p-1.5 rounded-full text-slate-700 hover:bg-slate-100">
            <MoreVertical className="w-5 h-5" />
          </button>

          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
            alt="User"
            className="w-8 h-8 rounded-full object-cover border border-slate-200"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-md mx-auto">
        {/* Photo Gallery Showcase */}
        <div className="relative aspect-[16/11] bg-slate-900 overflow-hidden">
          <img
            src={images[activePhotoIdx] || images[0]}
            alt={name}
            className="w-full h-full object-cover"
          />

          {/* Top Left Badge */}
          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Available 1st Sem
            </span>
          </div>

          {/* Top Right Photo Counter */}
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-xs">
              📷 {activePhotoIdx + 1} / {images.length} Photos
            </span>
          </div>

          {/* Thumbnail Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activePhotoIdx === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Floating 100% On-Site Inspected Banner (overlapping) */}
        <div className="-mt-3 mx-4 relative z-20">
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-md flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-[#0b1a30] leading-tight">
                100% On-Site Inspected • Balay Urios QA
              </p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5 font-medium">
                Passed physical water, wiring, & security audit
              </p>
            </div>
          </div>
        </div>

        {/* Pad Title & Pricing Details */}
        <div className="p-4 space-y-4">
          {/* Title & Location */}
          <div>
            <span className="text-[11px] font-extrabold tracking-wider text-[#854d0e] uppercase">
              {gender}
            </span>
            <h1 className="text-xl font-extrabold text-[#0b1a30] mt-0.5 tracking-tight">
              {name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1">
              <span>📍 {area}</span>
            </p>
          </div>

          {/* Price & Lease Terms Box */}
          <div className="bg-[#f8fafc] rounded-2xl p-4 border border-slate-200/80 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#0b1a30]">₱{price.toLocaleString()}</span>
                <span className="text-xs text-slate-500 font-bold">/ month</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {priceSubtext}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="font-extrabold text-slate-800">{advanceDeposit}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{minContract}</p>
            </div>
          </div>

          {/* Landlord Card */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={landlord.avatar}
                  alt={landlord.name}
                  className="w-11 h-11 rounded-full object-cover border border-slate-200"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                  ✓
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm text-[#0b1a30]">{landlord.name}</h4>
                  <span className="text-blue-600 text-xs">ℹ</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">{landlord.experience}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-[#fef3c7] text-[#78350f] px-2.5 py-1 rounded-xl text-xs font-extrabold border border-[#fde68a]">
              <Star className="w-3.5 h-3.5 fill-[#78350f] text-[#78350f]" />
              <span>{rating.toFixed(1)}</span>
              <span className="text-[#92400e] font-normal">({reviewCount})</span>
            </div>
          </div>

          {/* Quick Badges Row */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <div className="p-2.5 rounded-xl bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{floodRating.badge}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center gap-2">
              <Wifi className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">{wifiAudit.downloadMbps} Mbps On-Site Verified</span>
            </div>
          </div>

          {/* Feature Quick Launch Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenWalkPov(property)}
              className="p-3 rounded-2xl bg-[#0b1a30] text-white text-xs font-bold flex items-center justify-between shadow-xs hover:bg-[#152a4d] transition-all"
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-amber-400" />
                <span>60s Walk POV</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => onOpenCostCalc(property)}
              className="p-3 rounded-2xl bg-[#064e3b] text-white text-xs font-bold flex items-center justify-between shadow-xs hover:bg-[#065f46] transition-all"
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-300" />
                <span>True Cost Calc</span>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-300" />
            </button>
          </div>

          {/* ================================================================ */}
          {/* STUDENT REALITY CHECKLIST (BUTUAN VERIFIED)                       */}
          {/* ================================================================ */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[15px] text-[#0b1a30] flex items-center gap-2">
                  <span className="text-base">☑️</span>
                  Student Reality Checklist
                </h3>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Rigorous local checks for monsoon floods, brownouts, and study Wi-Fi.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                Butuan Verified
              </span>
            </div>

            {/* 1. Flood-Safe Zone Guaranteed */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="font-extrabold text-xs text-[#0b1a30]">Flood-Safe Zone Guaranteed</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#dcfce7] text-[#166534] text-[10px] font-extrabold">
                  {floodRating.tagBadge}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-9">
                {floodRating.description}
              </p>
              <div className="ml-9 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 flex items-center gap-2 font-medium">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{floodRating.history}</span>
              </div>
            </div>

            {/* 2. Uninterrupted Water System */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                    <Droplets className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="font-extrabold text-xs text-[#0b1a30]">Uninterrupted Water System</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#dbeafe] text-[#1e40af] text-[10px] font-extrabold">
                  {waterSystem.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-9">
                {waterSystem.description}
              </p>
              <div className="ml-9 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 text-[#1e40af] font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate">{waterSystem.tankCapacity}</span>
                </div>
                <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 text-[#1e40af] font-bold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>Auto Booster Pump</span>
                </div>
              </div>
            </div>

            {/* 3. Brownout Resilience Kit */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                    <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
                  </div>
                  <h4 className="font-extrabold text-xs text-[#0b1a30]">Brownout Resilience Kit</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#fef3c7] text-[#92400e] text-[10px] font-extrabold">
                  {powerSystem.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-9">
                {powerSystem.description}
              </p>
            </div>

            {/* 4. Speedtest™ On-Site Audit */}
            <div className="space-y-2.5 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                    <Wifi className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-[#0b1a30]">Speedtest™ On-Site Audit</h4>
                    <p className="text-[10px] text-slate-400 font-medium">{wifiAudit.verifiedDate}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                  {wifiAudit.ratingBadge}
                </span>
              </div>

              {/* Download / Upload Metric Cards */}
              <div className="ml-9 grid grid-cols-2 gap-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-semibold">Download Speed</p>
                  <p className="text-lg font-black text-[#0b1a30]">{wifiAudit.downloadMbps} <span className="text-xs font-normal">Mbps</span></p>
                  <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                    ↓ High Bandwidth
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-slate-400 font-semibold">Upload Speed</p>
                  <p className="text-lg font-black text-[#0b1a30]">{wifiAudit.uploadMbps} <span className="text-xs font-normal">Mbps</span></p>
                  <span className="text-[10px] text-blue-700 font-bold flex items-center gap-1 mt-0.5">
                    ↑ Fast Zoom/Canva
                  </span>
                </div>
              </div>

              {/* In-Room Cellular Carriers */}
              <div className="ml-9 pt-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  In-Room Cellular Carriers
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-bold">Globe</p>
                    <p className="text-xs font-black text-slate-800">{wifiAudit.carrierSignals.globe}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-bold">Smart</p>
                    <p className="text-xs font-black text-slate-800">{wifiAudit.carrierSignals.smart}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-bold">DITO</p>
                    <p className="text-xs font-black text-slate-800">{wifiAudit.carrierSignals.dito}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Campus Commute Breakdown */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <Compass className="w-4 h-4 text-blue-600" />
                </div>
                <h4 className="font-extrabold text-xs text-[#0b1a30]">Campus Commute Breakdown</h4>
              </div>

              {/* Mini Map Graphic Preview with Pill */}
              <div className="ml-9 rounded-2xl overflow-hidden border border-slate-200 relative bg-[#e2e8f0] h-28 flex items-center justify-center">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#64748b_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="z-10 text-center px-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0b1a30] text-white text-xs font-bold shadow-md">
                    <span className="text-amber-400">📍</span>
                    <span>260 meters to FSUU San Francisco Gate</span>
                  </div>
                </div>
              </div>

              {/* Commute Steps */}
              <div className="ml-9 space-y-2 text-xs">
                {commuteSteps.map((step) => (
                  <div key={step.num} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {step.num}
                    </span>
                    <div>
                      <p className="font-extrabold text-[#0b1a30]">{step.title}</p>
                      <p className="text-slate-500 text-[11px] leading-snug">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Included Amenities Grid */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs">
            <h3 className="font-extrabold text-sm text-[#0b1a30] mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Included Amenities
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {amenities.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 stroke-[2.5]" />
                  <span className="text-slate-700 font-bold">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student House Rules */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-xs space-y-3">
            <h3 className="font-extrabold text-sm text-[#0b1a30] flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              Student House Rules
            </h3>
            <div className="space-y-2.5 text-xs">
              {rules.map((rule, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="font-extrabold text-[#0b1a30] flex items-center gap-1.5">
                    <span className="text-amber-600 text-xs">🔒</span>
                    {rule.title}
                  </p>
                  <p className="text-slate-500 text-[11px] mt-0.5 pl-3">
                    {rule.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* FSUU Safe Deposit Protection */}
          <div className="p-4 rounded-3xl bg-[#eff6ff] text-[#0b1a30] border border-[#bfdbfe] flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#0b1a30] text-amber-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-tight text-[#0b1a30]">
                FSUU Student Safe Deposit Protection
              </h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-snug font-medium">
                Your advance deposit stays in Balay Urios Escrow until you move in and inspect your room key on Day 1.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Booking Bar matching mockup */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#0b1a30]">₱{price.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">/mo</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Deposit: ₱{price.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChat(property)}
              className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => onOpenScheduleVisit(property)}
              className="px-5 py-2.5 rounded-xl bg-[#78350f] hover:bg-[#6b2f0d] text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-amber-200" />
              <span>Schedule Visit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
