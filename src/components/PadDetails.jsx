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
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { APPLIANCE_CATALOG } from '../data/boardingHouses';

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

  // Inline True Cost State for Desktop Sticky Card
  const [selectedAppliances, setSelectedAppliances] = useState(['electric-fan', 'laptop', 'rice-cooker']);

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
    rules,
    vibeChecks
  } = property;

  const toggleAppliance = (id) => {
    setSelectedAppliances(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const appliancesTotal = selectedAppliances.reduce((sum, id) => {
    const item = APPLIANCE_CATALOG.find(a => a.id === id);
    return sum + (item ? item.monthlyCost : 0);
  }, 0);

  const grandTotal = price + appliancesTotal;

  return (
    <div className="bg-slate-50/50 min-h-screen pb-32">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md px-4 lg:px-8 py-3 border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 -ml-1.5 rounded-full text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1.5 font-bold text-xs"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              <span className="hidden sm:inline">Back to Listings</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#0b1a30] flex items-center justify-center text-amber-400">
                <Building2 className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-[15px] text-[#0b1a30] truncate">{name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenParentShare(property)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-colors"
              title="Share with Parents"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Parent Safety Card</span>
              <span className="sm:hidden">Share</span>
            </button>

            <button
              onClick={() => onOpenWalkPov(property)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors hidden sm:flex"
            >
              <Video className="w-3.5 h-3.5 text-blue-600" />
              <span>60s Walk POV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 lg:px-6 pt-4 lg:pt-6">
        
        {/* Responsive Photo Gallery: Desktop Mosaic vs Mobile Carousel */}
        <div className="hidden md:grid grid-cols-4 grid-rows-2 gap-2.5 h-[380px] lg:h-[440px] rounded-3xl overflow-hidden shadow-sm bg-slate-900 mb-6">
          <div className="col-span-2 row-span-2 relative group overflow-hidden">
            <img
              src={images[0]}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Available 1st Sem
            </span>
          </div>

          {images.slice(1, 4).map((img, idx) => (
            <div key={idx} className={`${idx === 0 ? 'col-span-2' : 'col-span-1'} relative group overflow-hidden`}>
              <img
                src={img}
                alt={`${name} photo ${idx + 2}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}

          {/* Photo Count Pill */}
          <div className="relative col-span-1 bg-slate-800 flex items-center justify-center text-white cursor-pointer hover:bg-slate-700 transition-colors">
            <span className="text-xs font-bold flex items-center gap-1">
              📷 View All {images.length} Photos
            </span>
          </div>
        </div>

        {/* Mobile Photo Carousel (Shown on mobile devices) */}
        <div className="md:hidden relative aspect-[16/11] bg-slate-900 rounded-3xl overflow-hidden shadow-sm -mx-2 sm:mx-0 mb-4">
          <img
            src={images[activePhotoIdx] || images[0]}
            alt={name}
            className="w-full h-full object-cover"
          />

          <div className="absolute top-3 left-3 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Available 1st Sem
            </span>
          </div>

          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-xs">
              📷 {activePhotoIdx + 1} / {images.length} Photos
            </span>
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
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

        {/* Main Two-Column Layout (Desktop 65% / 35%, Mobile Stacked) */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          
          {/* ======================================================== */}
          {/* LEFT COLUMN: PAD DETAILS & REALITY CHECKLIST             */}
          {/* ======================================================== */}
          <div className="w-full lg:w-[63%] space-y-5">
            
            {/* Header Titles */}
            <div>
              <span className="text-[11px] font-extrabold tracking-wider text-[#854d0e] uppercase">
                {gender}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0b1a30] mt-0.5 tracking-tight">
                {name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium flex items-center gap-1">
                <span>📍 {area}</span>
              </p>
            </div>

            {/* QA Inspected Banner */}
            <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 rounded-2xl p-3.5 border border-emerald-200/80 shadow-2xs flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-extrabold text-[#0b1a30] leading-tight">
                  100% On-Site Inspected • Balay Urios QA
                </p>
                <p className="text-[11px] text-slate-600 leading-tight mt-0.5 font-medium">
                  Passed physical water pressure, electrical wiring, & gate security audit
                </p>
              </div>
            </div>

            {/* Quick Badges Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
              <div className="p-3 rounded-2xl bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">{floodRating.badge}</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe] flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">{wifiAudit.downloadMbps} Mbps Tested</span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-[#fffbeb] text-[#92400e] border border-[#fde68a] flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{powerSystem.badge}</span>
              </div>
            </div>

            {/* Landlord Card */}
            <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={landlord.avatar}
                    alt={landlord.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                    ✓
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-sm text-[#0b1a30]">{landlord.name}</h4>
                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                      Verified Host
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{landlord.experience}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-[#fef3c7] text-[#78350f] px-3 py-1.5 rounded-2xl text-xs font-black border border-[#fde68a]">
                <Star className="w-3.5 h-3.5 fill-[#78350f] text-[#78350f]" />
                <span>{rating.toFixed(1)}</span>
                <span className="text-[#92400e] font-normal">({reviewCount})</span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* STUDENT REALITY CHECKLIST (BUTUAN VERIFIED)               */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-[#0b1a30] flex items-center gap-2">
                    <span className="text-lg">☑️</span>
                    Student Reality Checklist
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Rigorous local checks for monsoon floods, brownouts, and study Wi-Fi.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-black border border-blue-200">
                  Butuan Verified
                </span>
              </div>

              {/* 1. Flood-Safe Zone Guaranteed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h4 className="font-extrabold text-sm text-[#0b1a30]">Flood-Safe Zone Guaranteed</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#dcfce7] text-[#166534] text-[11px] font-extrabold">
                    {floodRating.tagBadge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
                  {floodRating.description}
                </p>
                <div className="ml-10 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{floodRating.history}</span>
                </div>
              </div>

              {/* 2. Uninterrupted Water System */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                      <Droplets className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="font-extrabold text-sm text-[#0b1a30]">Uninterrupted Water System</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#dbeafe] text-[#1e40af] text-[11px] font-extrabold">
                    {waterSystem.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
                  {waterSystem.description}
                </p>
                <div className="ml-10 grid grid-cols-2 gap-2 text-xs font-bold">
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[#1e40af] flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-blue-600" />
                    <span className="truncate">{waterSystem.tankCapacity}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-[#1e40af] flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-blue-600" />
                    <span>Auto Booster Pump</span>
                  </div>
                </div>
              </div>

              {/* 3. Brownout Resilience Kit */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                      <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
                    </div>
                    <h4 className="font-extrabold text-sm text-[#0b1a30]">Brownout Resilience Kit</h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#fef3c7] text-[#92400e] text-[11px] font-extrabold">
                    {powerSystem.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
                  {powerSystem.description}
                </p>
              </div>

              {/* 4. Speedtest On-Site Audit */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                      <Wifi className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0b1a30]">Speedtest™ On-Site Audit</h4>
                      <p className="text-[11px] text-slate-400 font-medium">{wifiAudit.verifiedDate}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                    {wifiAudit.ratingBadge}
                  </span>
                </div>

                <div className="ml-10 grid grid-cols-2 gap-2.5">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-400 font-semibold">Download Speed</p>
                    <p className="text-xl font-black text-[#0b1a30]">{wifiAudit.downloadMbps} <span className="text-xs font-normal">Mbps</span></p>
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                      ↓ High Bandwidth
                    </span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-400 font-semibold">Upload Speed</p>
                    <p className="text-xl font-black text-[#0b1a30]">{wifiAudit.uploadMbps} <span className="text-xs font-normal">Mbps</span></p>
                    <span className="text-[11px] text-blue-700 font-bold flex items-center gap-1 mt-0.5">
                      ↑ Fast Zoom / Canva
                    </span>
                  </div>
                </div>

                <div className="ml-10 pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    In-Room Cellular Carriers
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 font-bold text-blue-900">
                      Globe<br /><span className="text-slate-600 font-medium text-[11px]">{wifiAudit.carrierSignals.globe}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 font-bold text-emerald-900">
                      Smart<br /><span className="text-slate-600 font-medium text-[11px]">{wifiAudit.carrierSignals.smart}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100 font-bold text-blue-900">
                      DITO<br /><span className="text-slate-600 font-medium text-[11px]">{wifiAudit.carrierSignals.dito}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Campus Commute Breakdown */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                    <Compass className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="font-extrabold text-sm text-[#0b1a30]">Campus Commute Breakdown</h4>
                </div>

                <div className="ml-10 rounded-2xl bg-[#e2e8f0] p-4 text-center">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-[#0b1a30] text-white text-xs font-bold shadow-md">
                    📍 260 meters to FSUU San Francisco Gate
                  </span>
                </div>

                <div className="ml-10 space-y-2 text-xs sm:text-sm">
                  {commuteSteps.map((step) => (
                    <div key={step.num} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {step.num}
                      </span>
                      <div>
                        <p className="font-extrabold text-[#0b1a30]">{step.title}</p>
                        <p className="text-slate-500 text-xs">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Included Amenities Grid */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
              <h3 className="font-extrabold text-base text-[#0b1a30] mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Included Amenities
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-bold text-slate-700">
                {amenities.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-600 stroke-[2.5]" />
                    <span className="truncate">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Student House Rules */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3 text-xs">
              <h3 className="font-extrabold text-base text-[#0b1a30] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                Student House Rules
              </h3>
              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="font-extrabold text-[#0b1a30]">{rule.title}</p>
                    <p className="text-slate-500 text-[11.5px] mt-0.5">{rule.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Tenant Vibe Checks */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-[#0b1a30] flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  Verified Tenant "Vibe Checks"
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  @urios.edu.ph Verified
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between font-bold">
                  <span>Noise Level for Studying</span>
                  <span className="text-indigo-600">{vibeChecks.studyNoise} / 5.0</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${(vibeChecks.studyNoise / 5) * 100}%` }}></div>
                </div>

                <div className="flex justify-between font-bold pt-1">
                  <span>Cleanliness of Shared CR</span>
                  <span className="text-blue-600">{vibeChecks.crCleanliness} / 5.0</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${(vibeChecks.crCleanliness / 5) * 100}%` }}></div>
                </div>

                <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs text-indigo-950 italic mt-2">
                  {vibeChecks.studentTestimonial}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: STICKY BOOKING & TRUE COST WIDGET (DESKTOP) */}
          {/* ======================================================== */}
          <div className="w-full lg:w-[37%] lg:sticky lg:top-24 space-y-4">
            
            {/* Main Sticky Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg space-y-4">
              
              {/* Price & Terms Header */}
              <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-3xl font-black text-[#0b1a30]">₱{price.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 font-bold ml-1">/ month</span>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">{priceSubtext}</p>
                </div>
                <div className="text-right text-xs">
                  <p className="font-extrabold text-slate-800">{advanceDeposit}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{minContract}</p>
                </div>
              </div>

              {/* Embedded "True Monthly Cost" Appliance Calculator */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-[#0b1a30] flex items-center gap-1.5 uppercase tracking-wider">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <span>True Monthly Cost Breakdown:</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold">Toggles</span>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {APPLIANCE_CATALOG.slice(0, 4).map((app) => {
                    const isChecked = selectedAppliances.includes(app.id);
                    return (
                      <div
                        key={app.id}
                        onClick={() => toggleAppliance(app.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between select-none ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="accent-emerald-600 w-3.5 h-3.5 rounded"
                          />
                          <span className="truncate">{app.name}</span>
                        </div>
                        <span className="font-bold text-[#0b1a30] shrink-0">+₱{app.monthlyCost}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Total Computed Burn Box */}
                <div className="p-3.5 rounded-2xl bg-[#0b1a30] text-white space-y-1.5 shadow-sm">
                  <div className="flex justify-between text-xs text-blue-200 font-medium">
                    <span>Base Room Rent:</span>
                    <span>₱{price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-blue-200 font-medium">
                    <span>Appliances Add-Ons ({selectedAppliances.length} items):</span>
                    <span>+₱{appliancesTotal.toLocaleString()}</span>
                  </div>
                  <div className="pt-2 border-t border-blue-900 flex justify-between items-baseline font-black">
                    <span className="text-xs text-blue-300">True Monthly Total:</span>
                    <span className="text-xl text-amber-400">₱{grandTotal.toLocaleString()} <span className="text-xs font-normal text-blue-200">/mo</span></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => onOpenScheduleVisit(property)}
                  className="w-full py-3.5 rounded-2xl bg-[#78350f] hover:bg-[#6b2f0d] text-white text-xs font-black transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-amber-200" />
                  <span>Schedule Ocular Visit (Free)</span>
                </button>

                <button
                  onClick={() => onOpenChat(property)}
                  className="w-full py-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4 text-blue-700" />
                  <span>Chat with Landlady {landlord.name}</span>
                </button>

                <button
                  onClick={() => onOpenParentShare(property)}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Copy Parent Peace-of-Mind Summary</span>
                </button>
              </div>

              {/* Escrow Guarantee */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <b>FSUU Safe Deposit Protection:</b> Advance deposit stays held in Balay Urios Escrow until you move in on Day 1.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-Only Sticky Bottom Bar (Hidden on desktop screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[#0b1a30]">₱{price.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">/mo</span>
            </div>
            <p className="text-[10px] text-slate-400">Deposit: ₱{price.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChat(property)}
              className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold"
            >
              Chat
            </button>
            <button
              onClick={() => onOpenScheduleVisit(property)}
              className="px-5 py-2.5 rounded-xl bg-[#78350f] text-white text-xs font-black shadow-xs"
            >
              Schedule Visit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
