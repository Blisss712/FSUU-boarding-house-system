import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  FileText,
  Calendar,
  Building2,
  Phone,
  Mail
} from 'lucide-react';
import { api } from '../services/api';

/**
 * LandlordVerificationModal
 * Admin-only approval dialog for a landlord account. Approving here grants the
 * account the "Urios Verified" host badge across all of its listings.
 */
export default function LandlordVerificationModal({
  isOpen,
  landlord,
  listingCount = 0,
  onSave,
  onClose
}) {
  const [isUriosVerified, setIsUriosVerified] = useState(false);
  const [auditorName, setAuditorName] = useState('FSUU Housing Committee Admin');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!landlord) return;
    setIsUriosVerified(Boolean(landlord.isUriosVerified));
    setAuditorName(landlord.verifiedBy || 'FSUU Housing Committee Admin');
    setVerificationNotes(landlord.verificationNotes || '');
    setError('');
  }, [landlord]);

  if (!isOpen || !landlord) return null;

  const initials =
    landlord.avatarInitials ||
    (landlord.name || 'LL')
      .trim()
      .split(/\s+/)
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updated = await api.verifyLandlordAccount(landlord.id, {
        isUriosVerified,
        verificationStatus: isUriosVerified ? 'verified' : 'pending',
        verifiedBy: auditorName.trim() || 'FSUU Housing Committee Admin',
        verificationNotes: verificationNotes.trim()
      });
      onSave?.(updated);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to save the landlord verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden my-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-[#0b1a30] text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/30 text-purple-200 border border-purple-400/30 inline-flex items-center gap-1 mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            Auditor Account Approval
          </span>

          <h2 className="text-xl font-black tracking-tight">Landlord Verification</h2>
          <p className="text-xs text-purple-200/90 mt-1 max-w-sm">
            Approve this host account once and every pad it owns can carry the Urios Verified badge.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Account summary */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-[#0b1a30] text-white flex items-center justify-center font-black text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-sm text-slate-900 truncate">{landlord.name}</p>
              <p className="text-[11px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 shrink-0" />
                {landlord.email || 'No email on file'}
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {landlord.phone && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3 shrink-0" />
                    {landlord.phone}
                  </p>
                )}
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3 shrink-0" />
                  {listingCount} listing{listingCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </div>

          {/* Status toggle */}
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Account status
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsUriosVerified(true)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isUriosVerified
                    ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/30'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-2 font-extrabold text-xs text-slate-900">
                  <CheckCircle2 className={`w-4 h-4 ${isUriosVerified ? 'text-emerald-600' : 'text-slate-400'}`} />
                  Urios Verified
                </span>
                <span className="block text-[10px] text-slate-500 mt-1">
                  Approved host account
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsUriosVerified(false)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  !isUriosVerified
                    ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400/30'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="flex items-center gap-2 font-extrabold text-xs text-slate-900">
                  <ShieldCheck className={`w-4 h-4 ${!isUriosVerified ? 'text-amber-600' : 'text-slate-400'}`} />
                  Pending Verification
                </span>
                <span className="block text-[10px] text-slate-500 mt-1">
                  Not yet approved
                </span>
              </button>
            </div>
          </div>

          {/* Auditor + date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Approved by
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                placeholder="e.g. FSUU Housing Committee"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-600"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Verification date
              </label>
              <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
                {landlord.verifiedAt
                  ? String(landlord.verifiedAt).slice(0, 10)
                  : isUriosVerified
                    ? 'Recorded when you save'
                    : '—'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              Auditor notes (optional)
            </label>
            <textarea
              rows="3"
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder="e.g. Business permit, valid ID, and pad ownership documents checked and approved."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-600 resize-none"
            />
          </div>

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
              className={`px-5 py-2.5 rounded-2xl text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 ${
                loading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 active:scale-95'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              <span>{loading ? 'Saving...' : isUriosVerified ? 'Approve as Urios Verified' : 'Save Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
