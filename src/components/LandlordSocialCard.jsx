import React, { useEffect, useState } from 'react';
import {
  Share2,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react';
import { api } from '../services/api';
import SocialLinks from './SocialLinks';

/**
 * LandlordSocialCard
 * Social links block on the full landlord profile page.
 *
 * - Every viewer sees the host's public Facebook / Instagram / X links.
 * - The owning landlord can add or edit them right here.
 * - Admins and students only ever see the read-only view.
 */
export default function LandlordSocialCard({
  landlord,
  isOwnProfile = false,
  onSaved
}) {
  const [values, setValues] = useState({
    facebook: landlord?.facebook || '',
    instagram: landlord?.instagram || '',
    twitter: landlord?.twitter || ''
  });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setValues({
      facebook: landlord?.facebook || '',
      instagram: landlord?.instagram || '',
      twitter: landlord?.twitter || ''
    });
  }, [landlord?.userId, landlord?.facebook, landlord?.instagram, landlord?.twitter]);

  const hasAny = Boolean(
    String(values.facebook || '').trim() ||
    String(values.instagram || '').trim() ||
    String(values.twitter || '').trim()
  );

  // Visitors see nothing when the host has not connected any socials.
  if (!isOwnProfile && !hasAny) return null;

  const set = (field) => (e) => setValues(v => ({ ...v, [field]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const payload = {
        facebook: values.facebook.trim(),
        instagram: values.instagram.trim(),
        twitter: values.twitter.trim()
      };
      const updated = await api.updateSocialLinks(payload);

      const next = {
        facebook: updated?.facebook || payload.facebook,
        instagram: updated?.instagram || payload.instagram,
        twitter: updated?.twitter || payload.twitter
      };

      setValues(next);
      setEditing(false);
      setNotice('Social links saved. Everyone viewing your profile can now see them.');
      onSaved?.(next);
    } catch (err) {
      setError(err.message || 'Could not save your social links. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <Share2 className="w-3 h-3" />
            {isOwnProfile ? 'Your Social Links' : 'Connect with the Host'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isOwnProfile
              ? 'These are public and shown to students and other visitors on your profile.'
              : 'Public social profiles shared by this host.'}
          </p>
        </div>

        {isOwnProfile && !editing && (
          <button
            type="button"
            onClick={() => { setEditing(true); setNotice(''); setError(''); }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white text-[11px] font-bold transition-colors cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
            {hasAny ? 'Edit' : 'Connect socials'}
          </button>
        )}

        {isOwnProfile && editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError('');
              setValues({
                facebook: landlord?.facebook || '',
                instagram: landlord?.instagram || '',
                twitter: landlord?.twitter || ''
              });
            }}
            className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            title="Cancel editing"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
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

      {editing ? (
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Facebook</label>
              <input
                type="text"
                value={values.facebook}
                onChange={set('facebook')}
                placeholder="facebook.com/yourname"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b1a30]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Instagram</label>
              <input
                type="text"
                value={values.instagram}
                onChange={set('instagram')}
                placeholder="instagram.com/yourname"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b1a30]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">X / Twitter</label>
              <input
                type="text"
                value={values.twitter}
                onChange={set('twitter')}
                placeholder="x.com/yourname"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#0b1a30]"
              />
            </div>
          </div>

          <p className="text-[10px] text-slate-400">
            You can type a handle (@yourname) or paste the full link.
          </p>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError('');
                setValues({
                  facebook: landlord?.facebook || '',
                  instagram: landlord?.instagram || '',
                  twitter: landlord?.twitter || ''
                });
              }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 rounded-xl text-white text-xs font-black transition-all flex items-center gap-1.5 ${
                saving
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 cursor-pointer'
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving…' : 'Save social links'}</span>
            </button>
          </div>
        </form>
      ) : hasAny ? (
        <SocialLinks
          facebook={values.facebook}
          instagram={values.instagram}
          twitter={values.twitter}
          variant="cards"
        />
      ) : (
        <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
          <Share2 className="w-5 h-5 text-slate-400 mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-700">No social links yet</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Connect Facebook, Instagram or X so students can reach you.
          </p>
        </div>
      )}
    </div>
  );
}
