import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  Loader2,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ID_TYPES = [
  'Philippine National ID (PhilSys)',
  "Driver's License",
  'Philippine Passport',
  'UMID / SSS ID',
  'PRC ID',
  'Postal ID',
  "Voter's ID",
  'Senior Citizen ID',
  'Other Government ID'
];

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

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

function StatusChip({ status }) {
  const map = {
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
    pending: 'bg-amber-100 text-amber-900 border-amber-200'
  };
  const label = {
    approved: '✓ ID Approved',
    rejected: '✕ ID Rejected',
    pending: '⏳ Awaiting Review'
  }[status] || '⏳ Awaiting Review';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${map[status] || map.pending}`}>
      {label}
    </span>
  );
}

function PhotoPreview({ label, url, previewUrl }) {
  const src = previewUrl || url;
  if (!src) return null;

  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      className="block group"
      title={`Open ${label}`}
    >
      <div className="relative w-full h-28 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
        <img src={src} alt={label} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[9px] font-bold flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" />
          {label}
        </span>
      </div>
    </a>
  );
}

/**
 * LandlordIdCard
 * Private "valid ID" submission block for the landlord full profile page.
 *
 * - The landlord sees a masked summary and can submit / replace their ID.
 * - Admins/auditors see the full ID number and the uploaded photos.
 * - Everyone else never sees this card (the parent only renders it for the
 *   owner or an admin, and Supabase RLS enforces the same rule in the DB).
 */
export default function LandlordIdCard({ landlord, isOwnProfile = false, isAdmin = false }) {
  const { user } = useAuth();
  const targetId = landlord?.userId || (isOwnProfile ? user?.id : null);

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reviewing, setReviewing] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    fullName: landlord?.name || '',
    idType: ID_TYPES[0],
    idNumber: ''
  });
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);
  const [frontPreview, setFrontPreview] = useState('');
  const [backPreview, setBackPreview] = useState('');
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    if (!targetId) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    api.getLandlordId(targetId)
      .then(row => {
        if (!active) return;
        setRecord(row || null);
        setForm({
          fullName: row?.fullName || landlord?.name || '',
          idType: row?.idType || ID_TYPES[0],
          idNumber: row?.idNumber || ''
        });
        setEditing(!row && isOwnProfile);
      })
      .catch(() => {
        if (active) setRecord(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [targetId, landlord?.name, isOwnProfile]);

  // Keep the form prefilled with the account name on first open.
  useEffect(() => {
    if (!record && landlord?.name) {
      setForm(f => (f.fullName ? f : { ...f, fullName: landlord.name }));
    }
  }, [landlord?.name, record]);

  if (!isOwnProfile && !isAdmin) return null;

  const pickFile = (file, side) => {
    setError('');
    if (!file) {
      if (side === 'front') { setFrontFile(null); setFrontPreview(''); }
      else { setBackFile(null); setBackPreview(''); }
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG or WebP).');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('That image is larger than 8 MB. Please choose a smaller photo.');
      return;
    }

    if (side === 'front') {
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const resetPickedFiles = () => {
    setFrontFile(null);
    setBackFile(null);
    setFrontPreview('');
    setBackPreview('');
    if (frontInputRef.current) frontInputRef.current.value = '';
    if (backInputRef.current) backInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      let frontImagePath = record?.frontImagePath || null;
      let backImagePath = record?.backImagePath || null;

      if (frontFile) frontImagePath = await api.uploadLandlordIdImage(frontFile, 'front');
      if (backFile) backImagePath = await api.uploadLandlordIdImage(backFile, 'back');

      const saved = await api.submitLandlordId({
        userId: targetId,
        fullName: form.fullName,
        idType: form.idType,
        idNumber: form.idNumber,
        frontImagePath,
        backImagePath
      });

      setRecord(saved);
      setEditing(false);
      resetPickedFiles();
      setNotice('Valid ID submitted. Only FSUU admins and auditors can view it.');
    } catch (err) {
      setError(err.message || 'Could not submit your valid ID. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (status) => {
    setReviewing(status);
    setError('');
    try {
      const updated = await api.reviewLandlordId(targetId, {
        status,
        reviewedBy: user?.name || 'FSUU Housing Committee Admin'
      });
      if (updated) setRecord(updated);
    } catch (err) {
      setError(err.message || 'Could not update the ID review.');
    } finally {
      setReviewing('');
    }
  };

  // ── Loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <p className="text-[11px] font-bold">Loading valid ID record…</p>
        </div>
      </div>
    );
  }

  // ── Admin / auditor view ─────────────────────────────────────
  if (isAdmin) {
    return (
      <div className="bg-white rounded-2xl border border-purple-200 ring-1 ring-purple-100 shadow-xs p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wide flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Valid ID — Auditor Only
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Private record. Students and other landlords cannot see this.
            </p>
          </div>
          {record && <StatusChip status={record.status || 'pending'} />}
        </div>

        {!record ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
            <FileText className="w-5 h-5 text-slate-400 mx-auto mb-1" />
            <p className="text-xs font-bold text-slate-700">No valid ID submitted yet</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {landlord?.name || 'This landlord'} has not uploaded an ID for review.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Full name on ID</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 break-words">
                  {record.fullName || '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID type</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 break-words">
                  {record.idType || '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 sm:col-span-2">
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-wide flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  ID number (auditor view)
                </p>
                <p className="text-sm font-black text-slate-900 mt-0.5 tracking-wide break-all font-mono">
                  {record.idNumber || '—'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Submitted</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5">
                  {formatDate(record.submittedAt)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Reviewed by</p>
                <p className="text-xs font-bold text-slate-900 mt-0.5 break-words">
                  {record.reviewedBy || 'Not reviewed yet'}
                  {record.reviewedAt ? ` · ${formatDate(record.reviewedAt)}` : ''}
                </p>
              </div>
            </div>

            {(record.frontImageUrl || record.backImageUrl) && (
              <div className="grid grid-cols-2 gap-2.5">
                <PhotoPreview label="Front of ID" url={record.frontImageUrl} />
                <PhotoPreview label="Back of ID" url={record.backImageUrl} />
              </div>
            )}

            {record.reviewNotes && (
              <p className="text-[11px] text-slate-500 italic">Review notes: {record.reviewNotes}</p>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleReview('rejected')}
                disabled={Boolean(reviewing)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
              >
                {reviewing === 'rejected' ? 'Saving…' : 'Reject ID'}
              </button>
              <button
                type="button"
                onClick={() => handleReview('approved')}
                disabled={Boolean(reviewing)}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {reviewing === 'approved' ? 'Saving…' : 'Approve ID'}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }

  // ── Landlord (owner) view ────────────────────────────────────
  const showForm = editing || !record;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Valid ID for Verification
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Private — only FSUU admins and auditors can see your ID.
          </p>
        </div>
        {record && <StatusChip status={record.status || 'pending'} />}
      </div>

      {notice && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-start gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-bold flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!showForm && record && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID type</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{record.idType || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">ID number</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">{maskIdNumber(record.idNumber)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Submitted</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">{formatDate(record.submittedAt)}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Photos on file</p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {(record.frontImagePath ? 1 : 0) + (record.backImagePath ? 1 : 0)} uploaded
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Need to change it? Uploading again resets the review to pending.
            </p>
            <button
              type="button"
              onClick={() => { setEditing(true); setNotice(''); setError(''); }}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Update ID
            </button>
          </div>
        </>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Full name on ID</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                placeholder="e.g. Juan P. dela Cruz"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b1a30]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">ID type</label>
              <select
                value={form.idType}
                onChange={(e) => setForm(f => ({ ...f, idType: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b1a30] cursor-pointer"
              >
                {ID_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">ID number</label>
            <input
              type="text"
              value={form.idNumber}
              onChange={(e) => setForm(f => ({ ...f, idNumber: e.target.value }))}
              placeholder="Enter the number exactly as printed on your ID"
              required
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 font-mono tracking-wide focus:outline-none focus:border-[#0b1a30]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { side: 'front', label: 'Front of ID', file: frontFile, preview: frontPreview, inputRef: frontInputRef },
              { side: 'back', label: 'Back of ID (optional)', file: backFile, preview: backPreview, inputRef: backInputRef }
            ].map(({ side, label, file, preview, inputRef }) => {
              const existingUrl = side === 'front' ? record?.frontImageUrl : record?.backImageUrl;
              return (
                <div key={side}>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">{label}</label>
                  <div className="p-2 rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
                    {(preview || existingUrl) && (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden bg-slate-100">
                        <img
                          src={preview || existingUrl}
                          alt={label}
                          className="w-full h-full object-cover"
                        />
                        {file && (
                          <button
                            type="button"
                            onClick={() => pickFile(null, side)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                            title="Remove selected photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => pickFile(e.target.files?.[0], side)}
                      className="block w-full text-[10px] text-slate-500 file:mr-2 file:px-2.5 file:py-1.5 file:rounded-lg file:border-0 file:bg-[#0b1a30] file:text-white file:text-[10px] file:font-bold file:cursor-pointer hover:file:bg-[#1a3a6b]"
                    />
                    {!file && existingUrl && (
                      <p className="text-[9px] text-emerald-600 font-bold">✓ Photo already on file</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
            <p className="leading-relaxed">
              Your ID is stored privately in Supabase. Only admin and auditor accounts can
              open the full number and photos. Everyone else sees nothing.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {record && (
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  resetPickedFiles();
                  setError('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-white text-xs font-black transition-all flex items-center gap-1.5 ${
                saving
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer'
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              <span>{saving ? 'Submitting…' : record ? 'Resubmit for Review' : 'Submit Valid ID'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
