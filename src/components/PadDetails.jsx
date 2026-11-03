import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  ShieldCheck, 
  Wifi, 
  Droplets, 
  Zap, 
  Footprints, 
  CloudSun, 
  Star, 
  MessageCircle, 
  Calendar, 
  Clock, 
  Users, 
  Volume2, 
  Lock, 
  Check, 
  Signal, 
  Video, 
  Calculator, 
  Building2, 
  ChevronRight,
  KeyRound
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LandlordProfileSheet from './LandlordProfileSheet';
import BoardUnitModal from './BoardUnitModal';
import AdminAuditModal from './AdminAuditModal';
import CurfewApprovalModal from './CurfewApprovalModal';

export default function PadDetails({ 
  property, 
  onBack, 
  onOpenCostCalc, 
  onOpenWalkPov, 
  onOpenParentShare, 
  onOpenScheduleVisit, 
  onOpenChat,
  onViewLandlord,
  allProperties = [],
  onSelectProperty,
  onBoardSuccess,
  onOpenAuth,
  onUpdateProperty,
  appliances: propAppliances
}) {
  const { user } = useAuth();
  const [currentProp, setCurrentProp] = useState(property);
  useEffect(() => {
    if (property) setCurrentProp(property);
  }, [property]);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [appliancesList, setAppliancesList] = useState(propAppliances || []);
  const [showLandlordSheet, setShowLandlordSheet] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [isAdminAuditOpen, setIsAdminAuditOpen] = useState(false);
  const [isCurfewApprovalOpen, setIsCurfewApprovalOpen] = useState(false);

  useEffect(() => {
    if (!propAppliances || propAppliances.length === 0) {
      api.getAppliances().then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAppliancesList(data);
        }
      });
    }
  }, [propAppliances]);

  // Inline True Cost State for Desktop Sticky Card
  const [selectedAppliances, setSelectedAppliances] = useState(['electric-fan', 'laptop', 'rice-cooker']);

  if (!property) return null;

  const propToUse = currentProp || property;
  const {
    name = 'Boarding House',
    area = 'Butuan City',
    roomType = 'Private Room',
    gender = 'Co-ed Boarding House',
    price = 0,
    priceSubtext = '/month',
    advanceDeposit = '1 Month Advance, 1 Month Deposit',
    minContract = '1 Semester (5 Months)',
    rating = 4.8,
    reviewCount = 12,
    landlord: rawLandlord = {},
    images: rawImages = [],
    floodRating: rawFlood = {},
    waterSystem: rawWater = {},
    powerSystem: rawPower = {},
    wifiAudit: rawWifi = {},
    commuteSteps: rawCommute = [],
    amenities: rawAmenities = [],
    rules: rawRules = [],
    vibeChecks: rawVibe = {},
    badges = {}
  } = propToUse;

  const isUriosVerified = Boolean(badges.isUriosVerified);
  const auditorName = badges.auditorName || 'FSUU Housing Committee Admin';
  const inspectionDate = badges.inspectionDate || 'October 2026';
  const verifiedItems = badges.verifiedItems || {
    goodCondition: isUriosVerified,
    flood: isUriosVerified,
    water: isUriosVerified,
    power: isUriosVerified,
    mobile: isUriosVerified,
    wifi: isUriosVerified
  };
  const isConditionVerified = verifiedItems.goodCondition !== undefined 
    ? Boolean(verifiedItems.goodCondition) 
    : (verifiedItems.distance !== undefined ? Boolean(verifiedItems.distance) : isUriosVerified);

  const buildingCondition = property.buildingCondition || property.badges?.buildingCondition || {
    status: 'Good Condition (Rain or Shine)',
    badge: 'Rain or Shine Certified',
    roofCondition: '100% Leak-Free Metal Roof & Waterproof Sealing',
    drainage: 'Covered Elevated Walkways & Corridors',
    ventilation: 'High Ceilings & Heat-Reflecting Insulation',
    description: 'Audited rain-or-shine: zero roof leaks during heavy monsoon rains, dry common areas, and cool ventilation on hot sunny days.'
  };

  const landlord = {
    name: 'Verified Landlord',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    experience: 'Resident Owner & Caretaker',
    ...rawLandlord
  };

  const safeImages = Array.isArray(rawImages) && rawImages.length > 0
    ? rawImages
    : ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'];

  const isNoFloodSafe = rawFlood.isFloodFree === false || 
                        rawFlood.badge?.toLowerCase().includes('none') || 
                        rawFlood.badge?.toLowerCase().includes('prone');
  const floodRating = {
    isFloodFree: !isNoFloodSafe,
    badge: rawFlood.badge || (isNoFloodSafe ? 'None (Flood Watch Zone)' : 'Flood-Safe Zone'),
    tagBadge: rawFlood.tagBadge || (isNoFloodSafe ? 'Flood Watch Zone' : 'Verified Dry'),
    description: rawFlood.description || (isNoFloodSafe 
      ? 'Ground-level foundation. Prone to surface water accumulation during severe monsoon surges.' 
      : 'Elevated foundation with zero recorded typhoon flooding.'),
    history: rawFlood.history || (isNoFloodSafe 
      ? 'Prone during monsoon season - boarders advised to keep items elevated.' 
      : 'Guaranteed dry during heavy rains'),
    ...rawFlood
  };

  const isNoWaterBackup = rawWater.badge?.toLowerCase().includes('none') || 
                          rawWater.badge?.toLowerCase().includes('direct tap') || 
                          rawWater.tankCapacity?.toLowerCase().includes('none');
  const waterSystem = {
    hasBoosterPump: !isNoWaterBackup && (rawWater.hasBoosterPump ?? true),
    hasReserveTank: !isNoWaterBackup && (rawWater.hasReserveTank ?? true),
    badge: rawWater.badge || (isNoWaterBackup ? 'None (Direct City Tap Only)' : 'Overhead Tank + Pump'),
    description: rawWater.description || (isNoWaterBackup 
      ? 'Direct municipal water supply only. Water pressure may decrease during peak morning rush (6:30-8:00 AM).' 
      : 'Continuous uninterrupted water pressure with reserve tank.'),
    tankCapacity: rawWater.tankCapacity || (isNoWaterBackup ? 'None (Direct Tap Only)' : '1,000L Reserve Tank'),
    ...rawWater
  };

  const isNoPowerBackup = rawPower.badge?.toLowerCase().includes('none') || 
                          rawPower.badge?.toLowerCase().includes('no backup') || 
                          rawPower.badge?.toLowerCase().includes('no generator');
  const powerSystem = {
    hasSolarBackup: !isNoPowerBackup && Boolean(rawPower.hasSolarBackup),
    hasGenerator: !isNoPowerBackup && Boolean(rawPower.hasGenerator),
    badge: rawPower.badge || (isNoPowerBackup ? 'None (No Backup Power)' : 'Emergency Power Kit'),
    description: rawPower.description || (isNoPowerBackup 
      ? 'Standard electric grid connection only with no standby backup generators or solar battery lights.' 
      : 'Equipped with emergency lighting and backup recharge stations.'),
    ...rawPower
  };

  const isNoWifi = rawWifi.hasWifi === false || 
                   rawWifi.provider?.toLowerCase().includes('none') || 
                   (rawWifi.downloadMbps !== undefined && Number(rawWifi.downloadMbps) === 0);
  const wifiAudit = {
    hasWifi: !isNoWifi,
    downloadMbps: isNoWifi ? 0 : (Number(rawWifi.downloadMbps) || 85),
    uploadMbps: isNoWifi ? 0 : (Number(rawWifi.uploadMbps) || 45),
    provider: isNoWifi ? 'None (No Wi-Fi Provided)' : (rawWifi.provider || 'PLDT Home Fiber'),
    verifiedDate: rawWifi.verifiedDate || 'April 2026',
    ratingBadge: isNoWifi ? 'No Wi-Fi Provided' : (rawWifi.ratingBadge || 'Fiber Ready (Fast)'),
    ...rawWifi,
    carrierSignals: {
      globe: '5G (4 Bars)',
      smart: '5G (Full Bars)',
      dito: '4G LTE (Solid)',
      ...(rawWifi?.carrierSignals || {})
    }
  };

  const commuteSteps = Array.isArray(rawCommute) && rawCommute.length > 0 ? rawCommute : [
    { num: 1, title: 'Gate Exit', desc: 'Exit onto paved student access road' },
    { num: 2, title: 'Campus Gate', desc: 'Arrive at FSUU Gate in under 5 minutes' }
  ];

  const amenities = Array.isArray(rawAmenities) ? rawAmenities.map(item => 
    typeof item === 'string' ? { name: item } : item
  ) : [];

  const rules = Array.isArray(rawRules) ? rawRules.map(rule =>
    typeof rule === 'string' ? { title: rule, desc: 'House regulation' } : rule
  ) : [];

  const vibeChecks = {
    studyNoise: 4.5,
    crCleanliness: 4.8,
    curfewFlex: 4.6,
    studentTestimonial: 'Quiet environment ideal for nursing and engineering students during exam weeks.',
    ...rawVibe
  };

  const toggleAppliance = (id) => {
    setSelectedAppliances(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const appliancesTotal = selectedAppliances.reduce((sum, id) => {
    const item = appliancesList.find(a => a.id === id);
    return sum + (item ? item.monthlyCost : 0);
  }, 0);

  const grandTotal = Number(price || 0) + appliancesTotal;

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
            {onOpenCostCalc && (
              <button
                type="button"
                onClick={() => onOpenCostCalc(property)}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1.5 border border-emerald-200 transition-colors cursor-pointer"
                title="True Cost & Appliance Calculator"
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">True Cost Calc</span>
              </button>
            )}

            <button
              onClick={() => onOpenParentShare(property)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition-colors cursor-pointer"
              title="Share with Parents"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Parent Safety Card</span>
              <span className="sm:hidden">Share</span>
            </button>

            <button
              onClick={() => onOpenWalkPov(property)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors hidden sm:flex cursor-pointer"
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
              src={safeImages[0]}
              alt={name}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold bg-white/95 text-slate-800 shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Available 1st Sem
            </span>
          </div>

          {safeImages.slice(1, 4).map((img, idx) => (
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
              📷 View All {safeImages.length} Photos
            </span>
          </div>
        </div>

        {/* Mobile Photo Carousel (Shown on mobile devices) */}
        <div className="md:hidden relative aspect-[16/11] bg-slate-900 rounded-3xl overflow-hidden shadow-sm -mx-2 sm:mx-0 mb-4">
          <img
            src={safeImages[activePhotoIdx] || safeImages[0]}
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
              📷 {activePhotoIdx + 1} / {safeImages.length} Photos
            </span>
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
            {safeImages.map((_, idx) => (
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
                {gender} • {roomType}
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black text-[#0b1a30] mt-0.5 tracking-tight">
                  {name}
                </h1>
                {isUriosVerified && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 mt-1">
                    <span className="w-4.5 h-4.5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3.5]" />
                    </span>
                    <span>Urios Verified</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium flex items-center gap-1">
                <span>📍 {area}</span>
              </p>
            </div>

            {/* QA Inspected Banner */}
            {isUriosVerified ? (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 rounded-2xl p-4 text-white shadow-md border border-emerald-400/40 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 font-bold shrink-0 border border-white/20 shadow-xs">
                    <ShieldCheck className="w-6 h-6 fill-amber-300/30" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                        <span>★ URIOS STUDENT VERIFIED HOUSING</span>
                      </p>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wide">
                        100% AUDITED
                      </span>
                    </div>
                    <p className="text-[11.5px] text-emerald-100 leading-tight mt-0.5 font-medium">
                      Physically inspected on-site by {auditorName} • Certified {inspectionDate}
                    </p>
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-200 block">FSUU Housing Seal</span>
                  <span className="text-[11px] font-bold text-white">Trust Certified</span>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-3.5 border border-amber-200/80 shadow-2xs flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold shrink-0 shadow-xs">
                  <span className="text-sm">⏳</span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-extrabold text-[#0b1a30] leading-tight">
                    Pending Urios Student Audit • Landlord Claimed
                  </p>
                  <p className="text-[11px] text-slate-600 leading-tight mt-0.5 font-medium">
                    This unit has not yet been physically verified on-site by the FSUU Student Housing Committee
                  </p>
                </div>
              </div>
            )}

            {/* Quick Checklist Badges Row (6-Point Reality Checklist) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
              {/* 1. Good Condition (Rain or Shine) */}
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">{buildingCondition.status || 'Good Condition (Rain/Shine)'}</span>
              </div>
              {/* 2. Flood */}
              <div className={`p-3 rounded-2xl border flex items-center gap-2 ${floodRating.isFloodFree ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
                <ShieldCheck className={`w-4 h-4 shrink-0 ${floodRating.isFloodFree ? 'text-emerald-600' : 'text-amber-600'}`} />
                <span className="truncate">{floodRating.badge}</span>
              </div>
              {/* 3. Water */}
              <div className={`p-3 rounded-2xl border flex items-center gap-2 ${!isNoWaterBackup ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                <Droplets className={`w-4 h-4 shrink-0 ${!isNoWaterBackup ? 'text-sky-600' : 'text-slate-400'}`} />
                <span className="truncate">{waterSystem.badge}</span>
              </div>
              {/* 4. Power */}
              <div className={`p-3 rounded-2xl border flex items-center gap-2 ${!isNoPowerBackup ? 'bg-[#fffbeb] text-[#92400e] border-[#fde68a]' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                <Zap className={`w-4 h-4 shrink-0 ${!isNoPowerBackup ? 'text-amber-600 fill-amber-600' : 'text-slate-400'}`} />
                <span className="truncate">{powerSystem.badge}</span>
              </div>
              {/* 5. Mobile Data */}
              <div className="p-3 rounded-2xl bg-purple-50 text-purple-900 border border-purple-200 flex items-center gap-2">
                <Signal className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">DITO • Smart • Globe</span>
              </div>
              {/* 6. Wi-Fi */}
              <div className={`p-3 rounded-2xl border flex items-center gap-2 ${wifiAudit.hasWifi ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <Wifi className={`w-4 h-4 shrink-0 ${wifiAudit.hasWifi ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="truncate">{wifiAudit.hasWifi ? `${wifiAudit.downloadMbps} Mbps Fiber` : 'No Wi-Fi'}</span>
              </div>
            </div>

            {/* Landlord Card - Clickable to View Landlord Information */}
            <div 
              onClick={() => setShowLandlordSheet(true)}
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs flex items-center justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group/landlord"
              title="Click to view host credentials & full landlord profile"
            >
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={landlord.avatar}
                    alt={landlord.name}
                    className="w-12 h-12 rounded-full object-cover border-2 border-slate-200 group-hover/landlord:border-blue-600 transition-colors"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold">
                    ✓
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-sm text-[#0b1a30] group-hover/landlord:text-blue-900 transition-colors flex items-center gap-1.5">
                      <span>{landlord.name}</span>
                      <span className="text-[11px] text-blue-600 font-semibold hidden sm:inline">• View Host Info →</span>
                    </h4>
                    <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">
                      Verified Host
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{landlord.experience}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#fef3c7] text-[#78350f] px-3 py-1.5 rounded-2xl text-xs font-black border border-[#fde68a]">
                  <Star className="w-3.5 h-3.5 fill-[#78350f] text-[#78350f]" />
                  <span>{(Number(rating) || 4.8).toFixed(1)}</span>
                  <span className="text-[#92400e] font-normal">({reviewCount})</span>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 group-hover/landlord:bg-blue-50 text-slate-400 group-hover/landlord:text-blue-600 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* ADMIN REALITY AUDIT CONTROLS (Only visible to admin)       */}
            {/* ======================================================== */}
            {(user?.role === 'admin' || user?.isAdmin) && (
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0b1a30] rounded-3xl p-5 text-white shadow-lg space-y-4 border border-purple-500/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/30 text-purple-200 border border-purple-400/30 flex items-center justify-center font-bold text-lg shrink-0">
                      🛡️
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-white">FSUU Admin Verification Controls</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          isUriosVerified ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                        }`}>
                          {isUriosVerified ? '✓ Urios Student Verified' : '⏳ Pending Audit'}
                        </span>
                      </div>
                      <p className="text-xs text-purple-200 mt-0.5">
                        Logged in as FSUU Auditor. Review and mark this unit's checklist claims as verified.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAdminAuditOpen(true)}
                    className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <ShieldCheck className="w-4 h-4 text-purple-200" />
                    <span>Audit & Mark Checklist</span>
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STUDENT REALITY CHECKLIST (6-POINT AUDIT)                 */}
            {/* ======================================================== */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-black text-base text-[#0b1a30] flex items-center gap-2">
                    <span className="text-lg">☑️</span>
                    The Student Reality Checklist
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Rigorous physical checks for distance, monsoon floods, water pressure, blackouts & carrier signals.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-xs ${
                    isUriosVerified
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-400/60 ring-2 ring-emerald-500/20'
                      : 'bg-amber-50 text-amber-900 border-amber-300'
                  }`}>
                    {isUriosVerified ? (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0 drop-shadow-2xs" />
                        <span>★ URIOS STUDENT VERIFIED ({inspectionDate})</span>
                      </>
                    ) : (
                      <>
                        <span>⏳</span>
                        <span>Landlord Claimed (Pending Audit)</span>
                      </>
                    )}
                  </span>
                  {(user?.role === 'admin' || user?.isAdmin) && (
                    <button
                      type="button"
                      onClick={() => setIsAdminAuditOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 text-[10px] font-black transition-colors cursor-pointer"
                    >
                      Audit
                    </button>
                  )}
                </div>
              </div>

              {/* 1. Good Condition (Rain or Shine) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                      <CloudSun className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0b1a30]">1. Good Condition (Rain or Shine)</h4>
                      <p className="text-[11px] text-slate-400 font-medium">All-weather roof, covered corridors & ventilation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                      isConditionVerified ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isConditionVerified ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                          <span>Urios Verified</span>
                        </>
                      ) : (
                        <span>Claimed</span>
                      )}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-extrabold border border-amber-200">
                      {buildingCondition.badge || 'Rain or Shine Certified'}
                    </span>
                  </div>
                </div>
                <div className="ml-10 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/50 to-amber-50/30 p-3.5 border border-amber-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
                    <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-black shadow-2xs">
                      STRUCTURE AUDIT
                    </span>
                    <span>{buildingCondition.description}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-white/90 border border-amber-100">
                      <p className="text-[10px] uppercase font-black text-amber-800">Roof & Ceiling</p>
                      <p className="font-bold text-slate-800">{buildingCondition.roofCondition}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/90 border border-amber-100">
                      <p className="text-[10px] uppercase font-black text-amber-800">Monsoon Rain</p>
                      <p className="font-bold text-slate-800">{buildingCondition.drainage}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/90 border border-amber-100">
                      <p className="text-[10px] uppercase font-black text-amber-800">Sunny Heat</p>
                      <p className="font-bold text-slate-800">{buildingCondition.ventilation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Flood-Safe Zone Guaranteed */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${floodRating.isFloodFree ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      <ShieldCheck className={`w-4 h-4 ${floodRating.isFloodFree ? 'text-emerald-600' : 'text-amber-600'}`} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0b1a30]">2. Flood Zone Audit & Elevation</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Regional river surge audit & typhoon history</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                      verifiedItems.flood ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {verifiedItems.flood ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                          <span>Urios Verified</span>
                        </>
                      ) : (
                        <span>Claimed</span>
                      )}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${floodRating.isFloodFree ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                      {floodRating.tagBadge}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
                  {floodRating.description}
                </p>
                <div className="ml-10 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{floodRating.history}</span>
                </div>
              </div>

              {/* 3. Uninterrupted Water System */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${!isNoWaterBackup ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Droplets className={`w-4 h-4 ${!isNoWaterBackup ? 'text-sky-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0b1a30]">3. Water System Condition</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Overhead stainless tank + automated booster pump</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                      verifiedItems.water ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {verifiedItems.water ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                          <span>Urios Verified</span>
                        </>
                      ) : (
                        <span>Claimed</span>
                      )}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${!isNoWaterBackup ? 'bg-[#dbeafe] text-[#1e40af]' : 'bg-slate-100 text-slate-600'}`}>
                      {waterSystem.badge}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
                  {waterSystem.description}
                </p>
                {isNoWaterBackup ? (
                  <div className="ml-10 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium">
                    🚰 Connected directly to municipal water lines without booster pumps or reserve tanks.
                  </div>
                ) : (
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
                )}
              </div>

              {/* 4. Brownout Resilience Kit */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${!isNoPowerBackup ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Zap className={`w-4 h-4 ${!isNoPowerBackup ? 'text-amber-600 fill-amber-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0b1a30]">4. Brownout Resilience Condition</h4>
                      <p className="text-[11px] text-slate-400 font-medium">ANECO blackout resilience & charging backup</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                      verifiedItems.power ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {verifiedItems.power ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                          <span>Urios Verified</span>
                        </>
                      ) : (
                        <span>Claimed</span>
                      )}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${!isNoPowerBackup ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-slate-100 text-slate-600'}`}>
                      {powerSystem.badge}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-10">
                  {powerSystem.description}
                </p>
              </div>

              {/* 5. Mobile Data Speed (DITO, Smart, Globe) */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                      <Signal className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0b1a30]">5. Mobile Data In-Room Signal</h4>
                      <p className="text-[11px] text-slate-400 font-medium">Tested cellular signal bars & data speeds for DITO, Smart & Globe</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                      verifiedItems.mobile ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {verifiedItems.mobile ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                          <span>Urios Verified</span>
                        </>
                      ) : (
                        <span>Claimed</span>
                      )}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-extrabold">
                      3/3 Carriers Audited
                    </span>
                  </div>
                </div>

                <div className="ml-10 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-rose-50/80 border border-rose-200 font-bold text-rose-950">
                    <span className="text-xs font-black text-rose-700">DITO Telecommunity</span>
                    <p className="text-slate-700 font-bold text-xs mt-0.5">{wifiAudit.carrierSignals.dito}</p>
                    <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">Online Class Ready</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 font-bold text-emerald-950">
                    <span className="text-xs font-black text-emerald-700">Smart Communications</span>
                    <p className="text-slate-700 font-bold text-xs mt-0.5">{wifiAudit.carrierSignals.smart}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">High Stability</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 font-bold text-blue-950">
                    <span className="text-xs font-black text-blue-700">Globe Telecom</span>
                    <p className="text-slate-700 font-bold text-xs mt-0.5">{wifiAudit.carrierSignals.globe}</p>
                    <span className="text-[10px] text-blue-600 font-semibold block mt-0.5">Fast Data Coverage</span>
                  </div>
                </div>
              </div>

              {/* 6. Wi-Fi Speedtest On-Site Audit */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${wifiAudit.hasWifi ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Wifi className={`w-4 h-4 ${wifiAudit.hasWifi ? 'text-indigo-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-[#0b1a30]">6. Wi-Fi Speedtest™ On-Site Audit</h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {wifiAudit.hasWifi ? `${wifiAudit.verifiedDate} • ${wifiAudit.provider}` : 'Shared in-house Wi-Fi not provided by host'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs ${
                      verifiedItems.wifi ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {verifiedItems.wifi ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-amber-300 fill-amber-300 shrink-0" />
                          <span>Urios Verified</span>
                        </>
                      ) : (
                        <span>Claimed</span>
                      )}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold ${wifiAudit.hasWifi ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                      {wifiAudit.ratingBadge}
                    </span>
                  </div>
                </div>

                {wifiAudit.hasWifi ? (
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
                        ↑ Fast Zoom / Thesis Submissions
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="ml-10 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200/80 text-slate-500 flex items-center justify-center shrink-0">
                      <Wifi className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">No Shared In-House Wi-Fi</p>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        Students use personal mobile cellular data (DITO, Smart, Globe) or private pocket Wi-Fi. All 3 carriers have verified in-room signal as shown above.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Campus Walking Route & Proximity (Commute Details) */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-base text-[#0b1a30] flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-blue-600" />
                  Campus Walking Route & Proximity
                </h3>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-extrabold border border-blue-200">
                  📍 {property.gateProximities?.mainSFGate?.distanceMeters || 260}m ({property.gateProximities?.mainSFGate?.walkingMinutes || 3} min walk)
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                {commuteSteps.map((step) => (
                  <div key={step.num} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {step.num}
                    </span>
                    <p><span className="font-bold text-slate-800">{step.title}</span> — {step.desc}</p>
                  </div>
                ))}
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

            {/* Landlord Curfew Exemption Passes Review Div */}
            {user?.role === 'landlord' && (
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-700 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-amber-950">Curfew Exemption Passes</h4>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                        Host Portal
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-0.5">
                      Review, approve, and verify late-duty / hospital clinical exemption passes submitted for this pad.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCurfewApprovalOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Review & Approve Passes</span>
                </button>
              </div>
            )}

            {/* Student House Rules */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3 text-xs">
              <h3 className="font-extrabold text-base text-[#0b1a30] flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-600" />
                Student House Rules
              </h3>
              <div className="space-y-2">
                {rules.map((rule, idx) => {
                  const isCurfewRule = (rule.title || '').toLowerCase().includes('curfew') || (rule.title || '').toLowerCase().includes('gate');
                  return (
                    <div key={idx} className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="font-extrabold text-[#0b1a30]">{rule.title}</p>
                        {isCurfewRule && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-200">
                            Digital Exemption Slip Accepted
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11.5px] mt-0.5">{rule.desc}</p>
                    </div>
                  );
                })}
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
                  {onOpenCostCalc && (
                    <button
                      type="button"
                      onClick={() => onOpenCostCalc(property)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                    >
                      Full Calc & Aircon →
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {appliancesList.slice(0, 4).map((app) => {
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
                {/* 1. Primary Board This Unit CTA */}
                <button
                  type="button"
                  onClick={() => setIsBoardModalOpen(true)}
                  className="w-full py-3.5 rounded-2xl bg-[#0b1a30] hover:bg-[#152a4d] active:scale-[0.98] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 border border-blue-400/30 cursor-pointer"
                  title="Reserve and officially board this unit"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Board This Unit (Move In / Reserve)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenScheduleVisit(property)}
                  className="w-full py-3 rounded-2xl bg-[#78350f] hover:bg-[#6b2f0d] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-amber-200" />
                  <span>Schedule Ocular Visit (Free)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenChat(property)}
                  className="w-full py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-blue-700" />
                  <span>Chat with Landlady {landlord.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenParentShare(property)}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-[#0b1a30]">₱{price.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-bold">/mo</span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">Deposit: ₱{price.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenCostCalc && (
              <button
                type="button"
                onClick={() => onOpenCostCalc(property)}
                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold cursor-pointer"
                title="True Cost & Appliance Calculator"
              >
                <Calculator className="w-4 h-4 text-emerald-700" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenChat(property)}
              className="p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold cursor-pointer"
              title="Chat with host"
            >
              <MessageCircle className="w-4 h-4 text-blue-700" />
            </button>
            <button
              type="button"
              onClick={() => onOpenScheduleVisit(property)}
              className="px-3 py-2.5 rounded-xl bg-[#78350f] text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Visit</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBoardModalOpen(true)}
              className="px-3.5 py-2.5 rounded-xl bg-[#0b1a30] text-white text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Board Unit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Landlord Profile Sheet Modal */}
      {showLandlordSheet && (
        <LandlordProfileSheet
          landlord={landlord}
          allProperties={allProperties}
          currentProperty={property}
          onSelectProperty={onSelectProperty}
          onViewFullProfile={() => {
            setShowLandlordSheet(false);
            onViewLandlord?.(landlord);
          }}
          onOpenChat={onOpenChat}
          onClose={() => setShowLandlordSheet(false)}
        />
      )}

      {/* Board This Unit Modal */}
      {isBoardModalOpen && (
        <BoardUnitModal
          property={propToUse}
          user={user}
          onBoardSuccess={(newTenancy) => {
            setIsBoardModalOpen(false);
            onBoardSuccess?.(newTenancy);
          }}
          onOpenAuth={onOpenAuth}
          onClose={() => setIsBoardModalOpen(false)}
        />
      )}

      {/* Admin Audit Modal */}
      {(user?.role === 'admin' || user?.isAdmin) && (
        <AdminAuditModal
          isOpen={isAdminAuditOpen}
          property={propToUse}
          onSave={(saved) => {
            setCurrentProp(saved);
            onUpdateProperty?.(saved.id, saved);
          }}
          onClose={() => setIsAdminAuditOpen(false)}
        />
      )}

      {/* Landlord Curfew Approval Modal */}
      <CurfewApprovalModal
        isOpen={isCurfewApprovalOpen}
        property={propToUse}
        onClose={() => setIsCurfewApprovalOpen(false)}
      />
    </div>
  );
}
