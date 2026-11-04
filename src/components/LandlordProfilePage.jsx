import React from 'react';
import {
  ArrowLeft, Phone, BadgeCheck, Home, Star, MapPin,
  ShieldCheck, Clock, Award, CheckCircle2
} from 'lucide-react';
import { getGateDistance } from '../utils/distance';
import { useAuth } from '../context/AuthContext';
import LandlordIdCard from './LandlordIdCard';
import LandlordSocialCard from './LandlordSocialCard';

/**
 * LandlordProfilePage
 * Full-screen trust profile for a landlord.
 *
 * Props:
 *   landlord        — landlord object from any of their properties
 *   allProperties   — full property list to find all their pads
 *   currentProperty — which property was open when this was triggered
 *   onSelectProperty(p) — navigate to a pad
 *   onBack()        — go back to previous view
 */
export default function LandlordProfilePage({
  landlord,
  allProperties = [],
  currentProperty,
  onSelectProperty,
  onBack,
  onLandlordUpdated
}) {
  const { user } = useAuth();

  const sameText = (a, b) =>
    String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

  const theirPads = allProperties.filter(p => {
    const owner = p.landlord || {};
    if (landlord.userId && owner.userId && String(owner.userId) === String(landlord.userId)) return true;
    if (landlord.email && owner.email && sameText(owner.email, landlord.email)) return true;
    return Boolean(owner.name && landlord.name && sameText(owner.name, landlord.name));
  });
  const accountVerified = landlord.isUriosVerified === true;
  const verifiedLabel = landlord.verifiedBy || 'FSUU Student Housing Committee';
  const verifiedDate = landlord.verifiedAt
    ? String(landlord.verifiedAt).slice(0, 10)
    : null;

  const isAdmin = user?.role === 'admin' || user?.isAdmin === true;
  const isOwnProfile = Boolean(user) && (
    (landlord.userId && String(landlord.userId) === String(user.id)) ||
    (landlord.email && user.email && sameText(landlord.email, user.email))
  );
  const canSeeIdCard = isOwnProfile || isAdmin;

  const avgRating = theirPads.length
    ? (theirPads.reduce((s, p) => s + (p.rating || 0), 0) / theirPads.length).toFixed(1)
    : null;

  const totalReviews = theirPads.reduce((s, p) => s + (p.reviewCount || 0), 0);
  const totalAvailable = theirPads.reduce((s, p) => s + (p.availableCount || 0), 0);

  // Trust badge definitions
  const trustBadges = [
    {
      icon: accountVerified ? BadgeCheck : ShieldCheck,
      color: accountVerified ? 'text-emerald-600' : 'text-amber-600',
      bg: accountVerified ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200',
      label: accountVerified ? 'Urios Verified Landlord' : 'Verification Pending',
      detail: accountVerified
        ? `Account approved by ${verifiedLabel}${verifiedDate ? ` on ${verifiedDate}` : ''}.`
        : 'This host account is awaiting review by the FSUU Student Housing Committee.'
    },
    {
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-200',
      label: 'On-Site Inspected',
      detail: 'All pads physically inspected for flood, water & power compliance.'
    },
    {
      icon: Award,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      label: 'FSUU Housing Partner',
      detail: 'Recognized by FSUU Student Affairs & SSG.'
    },
    {
      icon: Clock,
      color: 'text-violet-600',
      bg: 'bg-violet-50 border-violet-200',
      label: landlord.experience || 'Experienced Host',
      detail: 'Consistent hosting track record with FSUU students.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Hero header ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-[#0b1a30] to-[#1a3a6b] px-4 pt-4 pb-8">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-white/70 hover:text-white text-xs font-bold mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-start gap-4 max-w-2xl mx-auto">
          {/* Avatar */}
          <div className="shrink-0">
            {landlord.avatar ? (
              <img
                src={landlord.avatar}
                alt={landlord.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center font-black text-2xl text-white shadow-lg">
                {landlord.initials}
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-white leading-tight">{landlord.name}</h1>
              {accountVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-black text-emerald-200">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  Urios Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black text-amber-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  Pending Verification
                </span>
              )}
            </div>
            <p className="text-sm text-blue-200 mt-0.5">{landlord.tag}</p>

            {/* Quick stats */}
            <div className="flex flex-wrap gap-3 mt-3">
              {avgRating && (
                <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {avgRating} avg · {totalReviews} reviews
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-xl px-3 py-1.5 text-white text-xs font-bold">
                <Home className="w-3.5 h-3.5 text-blue-300" />
                {theirPads.length} listing{theirPads.length !== 1 ? 's' : ''}
              </div>
              {totalAvailable > 0 && (
                <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl px-3 py-1.5 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {totalAvailable} room{totalAvailable !== 1 ? 's' : ''} open
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 pb-24">

          {/* Contact card */}
          {landlord.phone && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={`tel:${landlord.phone}`}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{landlord.phone}</p>
                    <p className="text-xs text-slate-500">Tap to call · 7AM–9PM</p>
                  </div>
                </a>
              </div>
            </div>
          )}

          {/* Social links (visible to all; editable by the host) */}
          <LandlordSocialCard
            landlord={landlord}
            isOwnProfile={isOwnProfile && !isAdmin}
            onSaved={onLandlordUpdated}
          />

          {/* Trust & safety badges */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Trust & Safety Verification
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {trustBadges.map(({ icon: Icon, color, bg, label, detail }) => (
                <div key={label} className={`flex items-start gap-3 p-3 rounded-xl border ${bg}`}>
                  <Icon className={`w-5 h-5 ${color} shrink-0 mt-0.5`} />
                  <div>
                    <p className={`text-xs font-bold ${color}`}>{label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Private valid ID (landlord owner + admins/auditors only) */}
          {canSeeIdCard && (
            <LandlordIdCard
              landlord={landlord}
              isOwnProfile={isOwnProfile && !isAdmin}
              isAdmin={isAdmin}
            />
          )}

          {/* About / policy summary derived from their pads */}
          {theirPads.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Hosting Standards
              </p>
              <div className="space-y-2 text-xs text-slate-700">
                {/* Collect unique amenities/rules from their pads */}
                {(() => {
                  const firstPad = theirPads[0];
                  const rules = firstPad.rules || [];
                  const amenities = firstPad.amenities || [];

                  // amenities are { name, icon }, rules are { title, desc }
                  const points = [
                    amenities[0]?.name && `✓ ${amenities[0].name}`,
                    amenities[1]?.name && `✓ ${amenities[1].name}`,
                    rules[0]?.title   && `📋 ${rules[0].title}`,
                    firstPad.floodRating?.isFloodFree && '🛡️ All properties in flood-safe zones',
                    firstPad.waterSystem?.hasBoosterPump && '💧 Booster pump + reserve tank installed',
                    (firstPad.powerSystem?.hasSolarBackup || firstPad.powerSystem?.hasGenerator) && '⚡ Brownout backup power available',
                  ].filter(Boolean);

                  return points.length > 0
                    ? points.map((pt, i) => (
                        <p key={i} className="flex items-start gap-2 leading-relaxed">
                          <span>{pt}</span>
                        </p>
                      ))
                    : <p className="text-slate-500 italic">Hosting details available on pad listings.</p>;
                })()}
              </div>
            </div>
          )}

          {/* Their listings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {theirPads.length === 1 ? 'Their listing' : `All ${theirPads.length} listings`}
              </p>
              {totalAvailable > 0 && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {totalAvailable} available now
                </span>
              )}
            </div>

            <div className="space-y-3">
              {theirPads.map(pad => {
                const gateDistance = getGateDistance(pad);
                const isActive = pad.id === currentProperty?.id;

                return (
                  <button
                    key={pad.id}
                    onClick={() => { onSelectProperty(pad); onBack(); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all hover:shadow-sm active:scale-[0.99] ${
                      isActive
                        ? 'border-[#0b1a30] bg-[#0b1a30]/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                      <img
                        src={pad.images?.[0]}
                        alt={pad.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-[13px] text-[#0b1a30] leading-tight">
                          {pad.name}
                          {isActive && (
                            <span className="ml-1.5 text-[10px] text-blue-600 font-bold">(viewing)</span>
                          )}
                        </p>
                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          pad.availableCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {pad.availableCount > 0 ? `${pad.availableCount} open` : 'Full'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <p className="text-[11px] text-slate-500 truncate">{pad.shortLocation}</p>
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[13px] font-extrabold text-[#0b1a30]">
                          ₱{pad.price.toLocaleString()}
                          <span className="text-[10px] text-slate-400 font-normal ml-0.5">/mo</span>
                        </span>
                        {gateDistance && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                            gateDistance.walkMinutes <= 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {gateDistance.minutesLabel}
                          </span>
                        )}
                        {pad.rating && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            {pad.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom trust footer */}
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <Award className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">FSUU Student Council Housing Partner</p>
              <p className="text-[11px] mt-0.5 leading-relaxed text-amber-800">
                Balay Urios works with FSUU Student Affairs & SSG to ensure all off-campus
                facilities meet safety, sanitation, and flood security standards before listing.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
