import React, { useEffect, useState } from 'react';
import {
  X, Loader2, BadgeCheck, ShieldCheck, GraduationCap, Mail, Phone,
  Home, Star, MapPin, Building2, Share2, AlertCircle, ChevronRight, Calendar
} from 'lucide-react';
import { api } from '../services/api';
import SocialLinks from './SocialLinks';

const ROLE_STYLE = {
  landlord: {
    label: 'Landlord',
    chip: 'bg-amber-400 text-slate-950 border-amber-300',
    avatar: 'bg-amber-500 text-white'
  },
  admin: {
    label: 'Auditor',
    chip: 'bg-purple-400 text-slate-950 border-purple-300',
    avatar: 'bg-purple-700 text-white'
  },
  boarder: {
    label: 'Student boarder',
    chip: 'bg-blue-300 text-slate-950 border-blue-200',
    avatar: 'bg-[#0b1a30] text-white'
  }
};

function roleStyle(role) {
  return ROLE_STYLE[role] || ROLE_STYLE.boarder;
}

function initialsOf(person) {
  if (!person) return '??';
  if (person.avatarInitials) return String(person.avatarInitials).toUpperCase();
  const name = String(person.name || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || '??';
  }
  if (person.email) return String(person.email).slice(0, 2).toUpperCase();
  return '??';
}

function formatJoined(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'long', year: 'numeric' });
}

/**
 * ChatProfileModal
 * The profile behind a chat head — works for landlords, students and auditors.
 *
 * Opened from the inbox list, the thread header, or a sender's avatar inside a
 * group thread. Account details are loaded with `api.getChatProfile`, which
 * returns the public profile row plus the context that matters in a chat
 * (a landlord's listings, a boarder's current pad when RLS allows it).
 *
 * Props:
 *   account          — the member `user` object from the conversation
 *   onClose()
 *   onOpenProperty({ id }) — optional; opens one of a landlord's listings
 */
export default function ChatProfileModal({ account, onClose, onOpenProperty }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const accountId = account?.id || null;

  useEffect(() => {
    if (!accountId) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');
    setProfile(null);

    api.getChatProfile(accountId)
      .then(result => {
        if (!cancelled) setProfile(result);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not load this profile.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountId]);

  // Esc closes the sheet.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!account) return null;

  // While the row loads, show what the conversation already knows.
  const person = profile?.user || account;
  const style = roleStyle(person.role);
  const isLandlord = person.role === 'landlord';
  const isVerified = person.isUriosVerified === true;
  const listings = profile?.listings || [];
  const tenancy = profile?.tenancy || null;
  const hasSocials = Boolean(person.facebook || person.instagram || person.twitter);
  const canOpenListing = typeof onOpenProperty === 'function';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs sm:p-4"
      onClick={(event) => { if (event.target === event.currentTarget) onClose?.(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${person.name || 'Account'} profile`}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden"
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="relative shrink-0 px-5 pt-5 pb-4 bg-gradient-to-br from-[#0b1a30] via-[#12284c] to-[#1c3f76] text-white">
          <div className="flex justify-center pt-0.5 pb-2 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/25" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close profile"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className={`w-16 h-16 rounded-2xl ${style.avatar} font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/20 shrink-0`}>
              {initialsOf(person)}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-black leading-tight truncate">
                {person.name || 'Account'}
              </h3>

              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide ${style.chip}`}>
                  {style.label}
                </span>

                {isLandlord && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${
                    isVerified
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                      : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
                  }`}>
                    {isVerified
                      ? <><BadgeCheck className="w-3 h-3" /> Urios Verified</>
                      : <><ShieldCheck className="w-3 h-3" /> Verification pending</>}
                  </span>
                )}
              </div>

              {person.email && (
                <p className="text-[11px] text-blue-200 mt-1.5 truncate">{person.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <div className="py-10 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-[11px] font-bold text-slate-500">Loading profile…</p>
            </div>
          ) : error ? (
            <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-[11.5px] font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Contact */}
              <section className="space-y-1.5">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Contact
                </h4>

                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="text-[12px] font-semibold text-slate-800 truncate">{person.email}</span>
                  </a>
                )}

                {person.phone && (
                  <a
                    href={`tel:${String(person.phone).replace(/\s+/g, '')}`}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="text-[12px] font-bold text-emerald-900 truncate">{person.phone}</span>
                    <span className="ml-auto text-[10px] font-bold text-emerald-700 shrink-0">Call</span>
                  </a>
                )}

                <p className="text-[10.5px] text-slate-400 px-1">
                  You are already chatting in the app — messages stay in this thread.
                </p>
              </section>

              {/* Landlord: verification + listings */}
              {isLandlord && (
                <>
                  <section className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Host verification
                    </h4>
                    <div className={`p-3 rounded-2xl border space-y-1 ${
                      isVerified
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}>
                      <p className="text-[12px] font-bold flex items-center gap-1.5">
                        {isVerified
                          ? <><BadgeCheck className="w-3.5 h-3.5 shrink-0" /> Approved host account</>
                          : <><ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Awaiting FSUU committee review</>}
                      </p>
                      {(person.verifiedBy || person.verifiedAt) && (
                        <p className="text-[10.5px] opacity-90">
                          {person.verifiedBy ? `Verified by ${person.verifiedBy}` : 'Verified'}
                          {person.verifiedAt ? ` · ${String(person.verifiedAt).slice(0, 10)}` : ''}
                        </p>
                      )}
                      {person.verificationNotes && (
                        <p className="text-[10.5px] opacity-90 leading-relaxed">{person.verificationNotes}</p>
                      )}
                    </div>
                  </section>

                  <section className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {listings.length === 0
                          ? 'Listings'
                          : listings.length === 1
                            ? 'Their listing'
                            : `Their listings (${listings.length})`}
                      </h4>
                      {listings.length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          {listings.reduce((total, item) => total + (item.availableCount || 0), 0)} rooms open
                        </span>
                      )}
                    </div>

                    {listings.length === 0 ? (
                      <p className="text-[11px] text-slate-500 px-1">
                        No board listing is linked to this host account yet.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {listings.map(listing => {
                          const body = (
                            <>
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                                {listing.images?.[0] ? (
                                  <img
                                    src={listing.images[0]}
                                    alt={listing.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    <Home className="w-5 h-5" />
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-[12px] font-bold text-[#0b1a30] truncate">{listing.name}</p>
                                <p className="text-[10.5px] text-slate-500 truncate flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  {listing.shortLocation || 'Butuan City'}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11.5px] font-extrabold text-[#0b1a30]">
                                    ₱{listing.price.toLocaleString()}
                                    <span className="text-[9.5px] text-slate-400 font-normal">{listing.priceSubtext}</span>
                                  </span>
                                  {listing.rating > 0 && (
                                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                      {listing.rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="shrink-0 flex flex-col items-end gap-1">
                                <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  listing.availableCount > 0
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-600 border-red-200'
                                }`}>
                                  {listing.availableCount > 0 ? `${listing.availableCount} open` : 'Full'}
                                </span>
                                {canOpenListing && (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                )}
                              </div>
                            </>
                          );

                          return canOpenListing ? (
                            <button
                              key={listing.id}
                              type="button"
                              onClick={() => onOpenProperty({ id: listing.id })}
                              className="w-full flex items-center gap-2.5 p-2 rounded-2xl border border-slate-200 hover:border-[#0b1a30]/30 hover:bg-slate-50 transition-colors cursor-pointer"
                              title={`View ${listing.name}`}
                            >
                              {body}
                            </button>
                          ) : (
                            <div
                              key={listing.id}
                              className="w-full flex items-center gap-2.5 p-2 rounded-2xl border border-slate-200"
                            >
                              {body}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}

              {/* Boarder: academics + the pad they board */}
              {person.role === 'boarder' && (
                <>
                  <section className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Student
                    </h4>
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                      <div className="flex items-start gap-2">
                        <GraduationCap className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold truncate">
                            {person.course || 'FSUU Student'}
                          </p>
                          <p className="text-[10.5px] text-blue-800">
                            {person.yearLevel || 'Year level not set'}
                          </p>
                        </div>
                      </div>

                      {tenancy && (
                        <div className="pt-2 border-t border-blue-200/70 flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wider text-blue-700">
                              Currently boarding at
                            </p>
                            <p className="text-[12px] font-bold truncate">
                              {tenancy.propertyName || 'A Balay Urios pad'}
                            </p>
                            <p className="text-[10.5px] text-blue-800 truncate">
                              {[tenancy.roomNumber, tenancy.semester].filter(Boolean).join(' · ') || 'Active tenancy'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}

              {/* Socials */}
              {hasSocials && (
                <section className="space-y-1.5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    Social profiles
                  </h4>
                  <SocialLinks
                    facebook={person.facebook}
                    instagram={person.instagram}
                    twitter={person.twitter}
                    variant="chips"
                  />
                </section>
              )}

              {/* Account meta */}
              <section className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatJoined(person.createdAt) ? `Joined ${formatJoined(person.createdAt)}` : 'Balay Urios account'}
                </span>
                <span className="font-mono uppercase tracking-wide">
                  {style.label}
                </span>
              </section>
            </>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div className="shrink-0 p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-500 leading-snug">
            Profiles are public to signed-in Balay Urios members.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
