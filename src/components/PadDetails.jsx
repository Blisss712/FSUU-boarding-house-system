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
  ChevronRight, 
  Check, 
  Signal, 
  Video, 
  Calculator,
  Compass,
  AlertTriangle,
  BadgeAlert
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
    amenities,
    rules,
    vibeChecks,
    gateProximities
  } = property;

  return (
    <div className="bg-slate-50 min-h-screen pb-28">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-full text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-bold text-sm text-slate-900">Pad Details</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onOpenParentShare(property)}
            className="px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1 transition-colors border border-blue-200"
            title="Share with Parents"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share w/ Parents</span>
          </button>

          <button
            onClick={() => onOpenCostCalc(property)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="Appliance Cost Calculator"
          >
            <Calculator className="w-4 h-4 text-emerald-700" />
          </button>

          <button
            onClick={() => onOpenWalkPov(property)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="60s Walk POV"
          >
            <Video className="w-4 h-4 text-blue-700" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Photo Gallery Carousel */}
        <div className="relative aspect-[16/11] bg-slate-900 overflow-hidden">
          <img
            src={images[activePhotoIdx] || images[0]}
            alt={name}
            className="w-full h-full object-cover transition-opacity duration-300"
          />

          {/* Top badges */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-900 shadow-sm backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Available 1st Sem
            </span>
          </div>

          <div className="absolute top-3 right-3 z-10">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur-md">
              📷 {activePhotoIdx + 1} / {images.length} Photos
            </span>
          </div>

          {/* Thumbnail Selectors */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`h-2 rounded-full transition-all ${
                  activePhotoIdx === idx ? 'w-6 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 100% On-Site Inspected Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <div className="text-xs">
            <p className="font-extrabold tracking-tight">100% On-Site Inspected • Balay Urios QA</p>
            <p className="text-emerald-100 text-[11px]">Passed physical water, wiring, & security audit</p>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Title & Location */}
          <div>
            <span className="text-[11px] font-extrabold tracking-wider text-amber-800 uppercase">
              {gender} • {roomType}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              {name}
            </h1>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>📍 {area}</span>
            </p>
          </div>

          {/* Price & Lease Terms Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900">₱{price.toLocaleString()}</span>
                <span className="text-xs text-slate-500 font-bold">/ month</span>
              </div>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                {priceSubtext}
              </p>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex flex-col sm:items-end">
              <span className="font-bold text-slate-800">{advanceDeposit}</span>
              <span className="text-[11px] text-slate-500">{minContract}</span>
            </div>
          </div>

          {/* Landlord Profile */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center font-bold text-sm text-amber-900 relative">
                {landlord.initials}
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  ✓
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-slate-900">{landlord.name}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-100">
                    Verified
                  </span>
                </div>
                <p className="text-xs text-slate-500">{landlord.experience}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-xl text-amber-900 font-bold text-xs border border-amber-200">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal">({reviewCount})</span>
            </div>
          </div>

          {/* Quick Verified Badges Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold whitespace-nowrap">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>{floodRating.badge}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold whitespace-nowrap">
              <Wifi className="w-4 h-4 text-blue-600" />
              <span>{wifiAudit.downloadMbps} Mbps On-Site Verified</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold whitespace-nowrap">
              <Droplets className="w-4 h-4 text-purple-600" />
              <span>{waterSystem.tankCapacity}</span>
            </div>
          </div>

          {/* Action Highlights: POV and True Cost Buttons */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onOpenWalkPov(property)}
              className="p-3 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white font-bold text-xs flex items-center justify-between shadow-xs hover:from-blue-950 hover:to-indigo-950 transition-all"
            >
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-300" />
                <div className="text-left">
                  <p className="leading-tight">60s Walk POV</p>
                  <p className="text-[10px] text-blue-200 font-normal">To SF Campus Gate</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-blue-300" />
            </button>

            <button
              onClick={() => onOpenCostCalc(property)}
              className="p-3 rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-800 text-white font-bold text-xs flex items-center justify-between shadow-xs hover:from-emerald-900 hover:to-teal-900 transition-all"
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-300" />
                <div className="text-left">
                  <p className="leading-tight">True Cost Calc</p>
                  <p className="text-[10px] text-emerald-200 font-normal">Include appliances</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-300" />
            </button>
          </div>

          {/* ================================================================ */}
          {/* STUDENT REALITY CHECKLIST (BUTUAN VERIFIED)                       */}
          {/* ================================================================ */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  Student Reality Checklist
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-bold">
                  Butuan Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Rigorous local checks for monsoon floods, brownouts, and study Wi-Fi.
              </p>
            </div>

            {/* 1. Flood-Safe Zone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Flood-Safe Zone Guaranteed</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                  Dry Footpath
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-9">
                {floodRating.description}
              </p>
              <div className="ml-9 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{floodRating.history}</span>
              </div>
            </div>

            {/* 2. Uninterrupted Water System */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                    <Droplets className="w-4 h-4 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Uninterrupted Water System</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                  24/7 Water Pressure
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-9">
                {waterSystem.description}
              </p>
              <div className="ml-9 grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span className="truncate">{waterSystem.tankCapacity}</span>
                </div>
                <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-blue-600" />
                  <span>Auto Booster Pump</span>
                </div>
              </div>
            </div>

            {/* 3. Brownout Resilience Kit */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <Zap className="w-4 h-4 text-amber-600" />
                  </div>
                  <h4 className="font-bold text-sm text-slate-900">Brownout Resilience Kit</h4>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                  {powerSystem.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-9">
                {powerSystem.description}
              </p>
            </div>

            {/* 4. Speedtest On-Site Audit */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                    <Wifi className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Speedtest™ On-Site Audit</h4>
                    <p className="text-[10px] text-slate-500 font-medium">{wifiAudit.verifiedDate}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  Excellent
                </span>
              </div>

              {/* Speed Test Metric Cards */}
              <div className="ml-9 grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-semibold">Download Speed</p>
                  <p className="text-lg font-black text-slate-900">{wifiAudit.downloadMbps} <span className="text-xs font-normal">Mbps</span></p>
                  <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    ↓ High Bandwidth
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-semibold">Upload Speed</p>
                  <p className="text-lg font-black text-slate-900">{wifiAudit.uploadMbps} <span className="text-xs font-normal">Mbps</span></p>
                  <span className="text-[10px] text-blue-700 font-semibold flex items-center gap-1 mt-0.5">
                    ↑ Fast Zoom / Canva
                  </span>
                </div>
              </div>

              {/* In-Room Cellular Carrier Signals */}
              <div className="ml-9 pt-1">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  In-Room Cellular Carriers
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-bold">Globe</p>
                    <p className="text-xs font-black text-slate-800">{wifiAudit.carrierSignals.globe}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] text-emerald-600 font-bold">Smart</p>
                    <p className="text-xs font-black text-slate-800">{wifiAudit.carrierSignals.smart}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-red-50 border border-red-100">
                    <p className="text-[10px] text-red-600 font-bold">DITO</p>
                    <p className="text-xs font-black text-slate-800">{wifiAudit.carrierSignals.dito}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Campus Commute Breakdown */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <Footprints className="w-4 h-4 text-purple-600" />
                </div>
                <h4 className="font-bold text-sm text-slate-900">Campus Commute Breakdown</h4>
              </div>

              {/* Mini Map Graphic Simulation */}
              <div className="ml-9 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-100 h-28 flex items-center justify-center">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="z-10 text-center px-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0f244a] text-white text-xs font-bold shadow-md">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>260 meters to FSUU San Francisco Gate</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium mt-1.5">
                    Safe residential path • Well-lit subdivision street lamps
                  </p>
                </div>
              </div>

              {/* Commute Steps */}
              <div className="ml-9 space-y-2 text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">3 mins walk (260m) to FSUU Main Gate</p>
                    <p className="text-slate-500 text-[11px]">Direct stroll through well-lit residential Guingona Subdivision pathway.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">5 mins walk to FSUU Gym & Canteen</p>
                    <p className="text-slate-500 text-[11px]">Fast shortcut across the corner bakery lane.</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">1 Direct Tricycle Ride (₱15) to Morelos Campus</p>
                    <p className="text-slate-500 text-[11px]">Abundant tricycles waiting right at the corner of JP Rizal Street.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Included Amenities Grid */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
            <h3 className="font-extrabold text-base text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Included Amenities
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {amenities.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-slate-700 font-semibold">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Student House Rules */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" />
              Student House Rules
            </h3>
            <div className="space-y-2.5 text-xs">
              {rules.map((rule, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {rule.title}
                  </p>
                  <p className="text-slate-600 text-[11px] mt-0.5 pl-3">
                    {rule.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Tenant Vibe Checks */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-indigo-600" />
                  Verified Tenant "Vibe Checks"
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rated exclusively by verified Urian residents via @urios.edu.ph
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200">
                Peer Verified
              </span>
            </div>

            {/* Vibe Metrics */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Noise Level for Studying</span>
                  <span className="text-indigo-600">{vibeChecks.studyNoise} / 5.0</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(vibeChecks.studyNoise / 5) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Cleanliness of Shared CR</span>
                  <span className="text-blue-600">{vibeChecks.crCleanliness} / 5.0</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(vibeChecks.crCleanliness / 5) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Kitchen & Cooking Access</span>
                  <span className="text-amber-600">{vibeChecks.kitchenAccess} / 5.0</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: `${(vibeChecks.kitchenAccess / 5) * 100}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-slate-800 mb-1">
                  <span>Landlady Strictness</span>
                  <span className="text-slate-600">{vibeChecks.landladyStrictness} / 5.0 (Balanced)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-slate-600 rounded-full" style={{ width: `${(vibeChecks.landladyStrictness / 5) * 100}%` }}></div>
                </div>
                <p className="text-[11px] text-slate-500 italic mt-1 pl-1">
                  Note: {vibeChecks.landladyNote}
                </p>
              </div>
            </div>

            {/* Student Quote */}
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs text-indigo-950 italic">
              {vibeChecks.studentTestimonial}
              <div className="not-italic text-[10px] text-indigo-700 font-bold mt-1 text-right">
                — Verified FSUU Senior, BS Accountancy
              </div>
            </div>
          </div>

          {/* FSUU Student Safe Deposit Escrow Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-[#0e1d3d] text-white flex items-start gap-3 shadow-sm">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-tight text-white">
                FSUU Student Safe Deposit Protection
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Your advance deposit stays protected in Balay Urios Escrow until you physically move in and verify room condition on Day 1.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Booking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-slate-900">₱{price.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">/mo</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Deposit: ₱{price.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenChat(property)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => onOpenScheduleVisit(property)}
              className="px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4 text-amber-100" />
              <span>Schedule Visit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
