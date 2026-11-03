import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Check, 
  Footprints, 
  CloudSun, 
  Droplets, 
  Zap, 
  Signal, 
  Wifi, 
  Calendar,
  UserCheck,
  FileText,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminAuditModal({
  isOpen,
  property,
  onSave,
  onClose
}) {
  const currentBadges = property?.badges || {};
  const currentVerified = Boolean(currentBadges.isUriosVerified);
  const isConditionVerified = currentBadges.verifiedItems?.goodCondition !== undefined
    ? Boolean(currentBadges.verifiedItems?.goodCondition)
    : (currentBadges.verifiedItems?.distance !== undefined ? Boolean(currentBadges.verifiedItems?.distance) : currentVerified);

  const existingItems = {
    goodCondition: isConditionVerified,
    flood: currentBadges.verifiedItems?.flood ?? currentVerified,
    water: currentBadges.verifiedItems?.water ?? currentVerified,
    power: currentBadges.verifiedItems?.power ?? currentVerified,
    mobile: currentBadges.verifiedItems?.mobile ?? currentVerified,
    wifi: currentBadges.verifiedItems?.wifi ?? currentVerified
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isUriosVerified, setIsUriosVerified] = useState(currentVerified);
  const [auditorName, setAuditorName] = useState(currentBadges.auditorName || 'FSUU Housing Committee Admin');
  const [inspectionDate, setInspectionDate] = useState(currentBadges.inspectionDate || 'October 2026');
  const [auditNotes, setAuditNotes] = useState(currentBadges.auditNotes || '');
  const [verifiedItems, setVerifiedItems] = useState(existingItems);

  useEffect(() => {
    if (property) {
      const b = property.badges || {};
      const verified = Boolean(b.isUriosVerified);
      const isCond = b.verifiedItems?.goodCondition !== undefined
        ? Boolean(b.verifiedItems?.goodCondition)
        : (b.verifiedItems?.distance !== undefined ? Boolean(b.verifiedItems?.distance) : verified);

      setIsUriosVerified(verified);
      setAuditorName(b.auditorName || 'FSUU Housing Committee Admin');
      setInspectionDate(b.inspectionDate || 'October 2026');
      setAuditNotes(b.auditNotes || '');
      setVerifiedItems({
        goodCondition: isCond,
        flood: b.verifiedItems?.flood ?? verified,
        water: b.verifiedItems?.water ?? verified,
        power: b.verifiedItems?.power ?? verified,
        mobile: b.verifiedItems?.mobile ?? verified,
        wifi: b.verifiedItems?.wifi ?? verified
      });
    }
  }, [property]);

  if (!isOpen || !property) return null;

  const toggleItem = (key) => {
    setVerifiedItems(prev => {
      const next = { ...prev, [key]: !prev[key] };
      const allTrue = Object.values(next).every(Boolean);
      setIsUriosVerified(allTrue);
      return next;
    });
  };

  const handleCheckAll = () => {
    setVerifiedItems({
      goodCondition: true,
      flood: true,
      water: true,
      power: true,
      mobile: true,
      wifi: true
    });
    setIsUriosVerified(true);
  };

  const handleUncheckAll = () => {
    setVerifiedItems({
      goodCondition: false,
      flood: false,
      water: false,
      power: false,
      mobile: false,
      wifi: false
    });
    setIsUriosVerified(false);
  };

  const handleSaveAudit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const auditPayload = {
        isUriosVerified,
        verifiedItems,
        auditorName: auditorName.trim() || 'FSUU Housing Committee Admin',
        inspectionDate: inspectionDate.trim() || 'October 2026',
        auditNotes: auditNotes.trim()
      };

      const updated = await api.verifyPropertyAudit(property.id, auditPayload);
      onSave?.(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save audit verification.');
    } finally {
      setLoading(false);
    }
  };

  // Landlord declared claims
  const walkMins = property.gateProximities?.mainSFGate?.walkingMinutes ?? 3;
  const walkMeters = property.gateProximities?.mainSFGate?.distanceMeters ?? 260;
  const floodClaim = property.floodRating?.badge || 'Flood-Safe Zone';
  const waterClaim = property.waterSystem?.badge || '24/7 Stainless Tank & Auto Pump';
  const powerClaim = property.powerSystem?.badge || 'Solar Emergency Lighting';
  const wifiClaim = property.wifiAudit?.hasWifi !== false && !property.wifiAudit?.provider?.toLowerCase().includes('none')
    ? `${property.wifiAudit?.downloadMbps || 85} Mbps (${property.wifiAudit?.provider || 'Fiber'})`
    : 'None (No Wi-Fi Provided)';

  const checkedCount = Object.values(verifiedItems).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0b1a30] text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
              Official FSUU Admin Auditor Portal
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            <span>Reality Checklist Verification</span>
          </h2>

          <p className="text-xs text-purple-200/90 mt-1 max-w-lg">
            Review the claims submitted by <b>{property.landlord?.name || 'Landlord'}</b> for <b>{property.name}</b>. Mark each verified item on-site.
          </p>

          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/15 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <span className="text-purple-300">Auditor Status:</span>
              <span className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                isUriosVerified ? 'bg-emerald-500 text-white shadow-xs' : 'bg-amber-400 text-amber-950 shadow-xs'
              }`}>
                {isUriosVerified ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>★ Urios Student Verified</span>
                  </>
                ) : (
                  <span>⏳ Pending Full Verification</span>
                )}
              </span>
            </div>

            <div className="text-xs font-bold text-purple-200">
              Score: <span className="text-white font-black">{checkedCount}/6 Items Checked</span>
            </div>
          </div>
        </div>

        {/* Audit Form Content */}
        <form onSubmit={handleSaveAudit} className="p-5 sm:p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Landlord Declared Claims vs Physical Audit:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCheckAll}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-extrabold text-xs transition-colors cursor-pointer"
              >
                ✓ Check All (6/6)
              </button>
              <button
                type="button"
                onClick={handleUncheckAll}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Reset Checks
              </button>
            </div>
          </div>

          {/* 6 Verification Checklist Toggles */}
          <div className="space-y-2.5">
            {/* 1. Good Condition (Rain or Shine) */}
            <div 
              onClick={() => toggleItem('goodCondition')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                verifiedItems.goodCondition
                  ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/30'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  verifiedItems.goodCondition ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <CloudSun className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900">1. Good Condition (Rain or Shine)</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      verifiedItems.goodCondition ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {verifiedItems.goodCondition ? '✓ Verified by Admin' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Landlord Claim: <b className="text-slate-800">{property.buildingCondition?.status || 'Good Condition (Rain or Shine)'} — {property.buildingCondition?.roofCondition || 'Inspected leak-free roof during typhoons, dry covered corridors, and cool ventilation.'}</b>
                  </p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                verifiedItems.goodCondition ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {verifiedItems.goodCondition && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* 2. Flood Safe */}
            <div 
              onClick={() => toggleItem('flood')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                verifiedItems.flood
                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  verifiedItems.flood ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900">2. Flood Safety & Elevation</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      verifiedItems.flood ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {verifiedItems.flood ? '✓ Verified by Admin' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Landlord Claim: <b className="text-slate-800">{floodClaim}</b>
                  </p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                verifiedItems.flood ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {verifiedItems.flood && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* 3. Water System */}
            <div 
              onClick={() => toggleItem('water')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                verifiedItems.water
                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  verifiedItems.water ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Droplets className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900">3. Water Pressure & Reserve Tank</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      verifiedItems.water ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {verifiedItems.water ? '✓ Verified by Admin' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Landlord Claim: <b className="text-slate-800">{waterClaim}</b>
                  </p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                verifiedItems.water ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {verifiedItems.water && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* 4. Brownout Resilience */}
            <div 
              onClick={() => toggleItem('power')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                verifiedItems.power
                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  verifiedItems.power ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900">4. Brownout & Blackout Resilience</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      verifiedItems.power ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {verifiedItems.power ? '✓ Verified by Admin' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Landlord Claim: <b className="text-slate-800">{powerClaim}</b>
                  </p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                verifiedItems.power ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {verifiedItems.power && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* 5. Mobile Data Signal */}
            <div 
              onClick={() => toggleItem('mobile')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                verifiedItems.mobile
                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  verifiedItems.mobile ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Signal className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900">5. In-Room Cellular Data Signals</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      verifiedItems.mobile ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {verifiedItems.mobile ? '✓ Verified by Admin' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Landlord Claim: <b className="text-slate-800">DITO • Smart • Globe 4G/5G In-Room Coverage</b>
                  </p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                verifiedItems.mobile ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {verifiedItems.mobile && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>

            {/* 6. Wi-Fi Speed */}
            <div 
              onClick={() => toggleItem('wifi')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                verifiedItems.wifi
                  ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  verifiedItems.wifi ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs text-slate-900">6. Wi-Fi Speedtest™ Audit</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                      verifiedItems.wifi ? 'bg-emerald-200/80 text-emerald-900' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {verifiedItems.wifi ? '✓ Verified by Admin' : 'Unverified'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Landlord Claim: <b className="text-slate-800">{wifiClaim}</b>
                  </p>
                </div>
              </div>

              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                verifiedItems.wifi ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
              }`}>
                {verifiedItems.wifi && <Check className="w-4 h-4 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Audit Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Official Auditor Name / Board
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder="e.g. FSUU Student Housing Committee"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Audit & Inspection Date
              </label>
              <input
                type="text"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
                placeholder="e.g. October 2026"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              On-Site Inspection Notes (Optional)
            </label>
            <textarea
              rows="2"
              value={auditNotes}
              onChange={(e) => setAuditNotes(e.target.value)}
              placeholder="e.g. On-site speedtest verified 85 Mbps PLDT fiber in Room 204. Overhead stainless reserve tank tested operational."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-600 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 active:scale-95 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              <span>{loading ? 'Saving to Database...' : 'Save & Certify Unit Verification'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
