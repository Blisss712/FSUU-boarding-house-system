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
  Mail,
  Lock,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ID_STATUS_META = {
  approved: {
    label: 'Valid ID approved',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    box: 'bg-emerald-50 border-emerald-200'
  },
  rejected: {
    label: 'Valid ID rejected',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    box: 'bg-rose-50 border-rose-200'
  },
  pending: {
    label: 'Valid ID awaiting review',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    box: 'bg-amber-50 border-amber-200'
  },
  missing: {
    label: 'No valid ID on file',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    box: 'bg-slate-50 border-slate-200'
  }
};

function maskIdNumber(value) {
  const digits = String(value || '').replace(/\s+/g, '');
  if (!digits) return '—';
  if (digits.length <= 4) return '••••';
  return `•••• ${digits.slice(-4)}`;
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * LandlordVerificationModal
 * Admin-only decision dialog for a landlord account.
 *
 * The verification process has a fixed order and this dialog enforces it:
 *   Step 1 — review the submitted valid ID (LandlordIdCard / step 1 card here).
 *   Step 2 — approve the account as "Urios Verified".
 *
 * "Urios Verified" cannot be selected until the ID record is `approved`, and
 * `api.verifyLandlordAccount` independently refuses the write, so the badge
 * can never be granted without an ID check.
 */
export default function LandlordVerificationModal({
  isOpen,
  landlord,
  listingCount = 0,
  onSave,
  onReviewId,
  onClose
}) {
  const { user } = useAuth();
  const [isUriosVerified, setIsUriosVerified] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [idRecord, setIdRecord] = useState(null);
  const [idLoading, setIdLoading] = useState(false);
  const [idLoaded, setIdLoaded] = useState(false);
  const [idError, setIdError] = useState('');

  const landlordId = landlord?.id || landlord?.userId || null;
  const auditorName = user?.name || user?.email || 'FSUU Housing Committee Admin';

  // Load the valid-ID record that step 2 depends on.
  useEffect(() => {
    if (!isOpen || !landlordId) return undefined;

    let active = true;
    setIdLoading(true);
    setIdLoaded(false);
    setIdError('');
    setIdRecord(null);

    api.getLandlordId(landlordId)
      .then(row => {
        if (active) setIdRecord(row || null);
      })
      .catch(err => {
        if (active) setIdError(err.message || 'Could not load the valid ID record.');
      })
      .finally(() => {
        if (active) {
          setIdLoading(false);
          setIdLoaded(true);
        }
      });

    return () => { active = false; };
  }, [isOpen, landlordId]);

  useEffect(() => {
    if (!landlord) return;
    setIsUriosVerified(Boolean(landlord.isUriosVerified));
    setVerificationNotes(landlord.verificationNotes || '');
    setError('');
  }, [landlord]);

  // A stored "verified" flag without an approved ID is stale: show the account
  // as pending so saving here clears it instead of re-affirming a badge that
  // has no ID behind it.
  useEffect(() => {
    if (!idLoaded) return;
    if (isUriosVerified && idRecord?.status !== 'approved') {
      setIsUriosVerified(false);
    }
  }, [idLoaded, idRecord?.status, isUriosVerified]);

  if (!isOpen || !landlord) return null;

  const idStatus = idRecord?.status || 'missing';
  const idApproved = idStatus === 'approved';
  const idMeta = ID_STATUS_META[idStatus] || ID_STATUS_META.missing;

  const initials =
    landlord.avatarInitials ||
    (landlord.name || 'LL')
      .trim()
      .split(/\s+/)
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

  const canApprove = idApproved;
  const canSubmit = !loading && (!isUriosVerified || canApprove);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    if (isUriosVerified && !canApprove) {
      setError(
        idStatus === 'missing'
          ? 'Step 1 is incomplete: no valid ID has been submitted. Ask the landlord to submit one, then approve it.'
          : `Step 1 is incomplete: the valid ID is ${idStatus}. Approve the ID before approving the account.`
      );
      return;
    }

    setLoading(true);

    try {
      const updated = await api.verifyLandlordAccount(landlordId, {
        isUriosVerified,
        verificationStatus: isUriosVerified ? 'verified' : 'pending',
        verifiedBy: auditorName,
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
            Fixed order: approve the valid ID first, then approve the account. One account approval
            covers every pad the host owns.
          </p>
        </div>

        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4 max-h-[calc(100dvh-8rem)] overflow-y-auto">

          {/* Step rail */}
          <ol className="grid grid-cols-2 gap-2">
            <li className={`p-2.5 rounded-2xl border flex items-start gap-2 ${
              idApproved ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-purple-300 ring-1 ring-purple-200'
            }`}>
              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                idApproved ? 'bg-emerald-600 text-white' : 'bg-purple-700 text-white'
              }`}>
                {idApproved ? '✓' : '1'}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold text-slate-900 leading-tight">Valid ID review</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {idLoading ? 'Checking…' : idApproved ? 'Done' : 'Required first'}
                </p>
              </div>
            </li>
            <li className={`p-2.5 rounded-2xl border flex items-start gap-2 ${
              canApprove ? 'bg-white border-purple-300 ring-1 ring-purple-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                canApprove ? 'bg-purple-700 text-white' : 'bg-slate-300 text-white'
              }`}>
                {canApprove ? '2' : <Lock className="w-2.5 h-2.5" />}
              </span>
              <div className="min-w-0">
                <p className={`text-[11px] font-extrabold leading-tight ${canApprove ? 'text-slate-900' : 'text-slate-500'}`}>
                  Account approval
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {canApprove ? 'Ready' : 'Locked until step 1'}
                </p>
              </div>
            </li>
          </ol>

          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Step 1: the ID that must be approved first ─────────── */}
          <div className={`p-3.5 rounded-2xl border space-y-2.5 ${idMeta.box}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Step 1 · Valid ID
              </p>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black ${idMeta.badge}`}>
                {idLoading ? 'Checking…' : idMeta.label}
              </span>
            </div>

            {idError ? (
              <p className="text-[11px] font-bold text-rose-800">{idError}</p>
            ) : idLoading ? (
              <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading the submitted ID…
              </p>
            ) : !idRecord ? (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-800">No valid ID has been submitted yet.</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  The account cannot be marked Urios Verified without one. The landlord can submit it
                  from their profile → <b>Submit / update valid ID</b>.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-xl bg-white/70 border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">ID type</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5 break-words">{idRecord.idType || '—'}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/70 border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">ID number</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5 font-mono">
                      {maskIdNumber(idRecord.idNumber)}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/70 border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Submitted</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5">{formatDate(idRecord.submittedAt)}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/70 border border-slate-200">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Reviewed by</p>
                    <p className="text-[11px] font-bold text-slate-900 mt-0.5 break-words">
                      {idRecord.reviewedBy || 'Not reviewed yet'}
                    </p>
                  </div>
                </div>

                {(idRecord.frontImageUrl || idRecord.backImageUrl) && (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { url: idRecord.frontImageUrl, label: 'Front of ID' },
                      { url: idRecord.backImageUrl, label: 'Back of ID' }
                    ].filter(photo => photo.url).map(photo => (
                      <a
                        key={photo.label}
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-xl overflow-hidden border border-slate-200 bg-white"
                        title={`Open ${photo.label}`}
                      >
                        <img src={photo.url} alt={photo.label} className="w-full h-20 object-cover" />
                        <span className="block px-2 py-1 text-[9px] font-bold text-slate-600">{photo.label} ↗</span>
                      </a>
                    ))}
                  </div>
                )}

                {idStatus === 'rejected' && idRecord.reviewNotes && (
                  <p className="text-[11px] text-rose-800 font-medium">
                    <b>Rejected:</b> {idRecord.reviewNotes}
                  </p>
                )}

                {!idApproved && (
                  <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                    Approve this ID in step 1 to unlock account approval.
                  </p>
                )}
              </>
            )}

            {onReviewId && (
              <button
                type="button"
                onClick={onReviewId}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-[11px] font-black transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                {idApproved ? 'Open ID record' : idRecord ? 'Review / approve this ID' : 'Open landlord profile'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

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

          {/* ── Step 2: account status ─────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              Step 2 · Account status
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { if (canApprove) { setIsUriosVerified(true); setError(''); } }}
                disabled={!canApprove}
                aria-disabled={!canApprove}
                title={canApprove ? 'Approve this host account' : 'Approve the valid ID first'}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  isUriosVerified && canApprove
                    ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400/30 cursor-pointer'
                    : canApprove
                      ? 'bg-slate-50 border-slate-200 hover:border-slate-300 cursor-pointer'
                      : 'bg-slate-100 border-dashed border-slate-300 opacity-70 cursor-not-allowed'
                }`}
              >
                <span className="flex items-center gap-2 font-extrabold text-xs text-slate-900">
                  {canApprove ? (
                    <CheckCircle2 className={`w-4 h-4 ${isUriosVerified ? 'text-emerald-600' : 'text-slate-400'}`} />
                  ) : (
                    <Lock className="w-4 h-4 text-slate-400" />
                  )}
                  Urios Verified
                </span>
                <span className="block text-[10px] text-slate-500 mt-1">
                  {canApprove ? 'Approved host account' : 'Locked until the ID is approved'}
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

            {idLoaded && landlord.isUriosVerified && !canApprove && (
              <p className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-2 leading-relaxed">
                This account still carries an old Urios Verified flag, but its valid ID is not
                approved. Saving now clears the badge.
              </p>
            )}

            {!canApprove && (
              <p className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-2 leading-relaxed">
                Account approval is locked. Finish step 1 — review and approve the valid ID — and this
                option unlocks. You can still save the account as pending.
              </p>
            )}
          </div>

          {/* Auditor + date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                Approved by
              </label>
              <div className="w-full px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 truncate">
                {auditorName}
              </div>
              <p className="text-[9px] text-slate-400 mt-1">
                Taken from the signed-in auditor account — not editable.
              </p>
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
              placeholder="e.g. PhilSys ID number and photo match the registered host name."
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
              disabled={!canSubmit}
              className={`px-5 py-2.5 rounded-2xl text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 ${
                canSubmit
                  ? 'bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 active:scale-95 cursor-pointer'
                  : 'bg-slate-400 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              <span>
                {loading
                  ? 'Saving...'
                  : isUriosVerified
                    ? (canApprove ? 'Approve as Urios Verified' : 'Approve ID first')
                    : 'Save Status'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
