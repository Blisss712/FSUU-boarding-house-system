import React from 'react';
import { CloudSun, ShieldCheck, Droplets, Zap, Wifi, Signal } from 'lucide-react';
import { getStudentChecklist } from '../utils/checklist';

/**
 * Compact checklist summary shown on feed cards.
 *
 * Every chip reports the host's declaration state: a claim the host never made
 * reads "not declared" instead of borrowing a "flood-safe" or "direct tap"
 * verdict, so the cards cannot advertise features nobody declared.
 */
export default function StudentChecklistTags({ property, compact = false }) {
  const checklist = getStudentChecklist(property);
  if (!checklist) return null;

  const isUriosVerified = Boolean(property?.badges?.isUriosVerified);
  const verifiedCount = Object.values(checklist.verifiedItems || {}).filter(Boolean).length;

  const {
    goodCondition,
    floodSafe,
    waterSystem,
    brownoutResilience,
    mobileData,
    wifi
  } = checklist;

  const conditionText = !goodCondition.declared
    ? 'Condition n/d'
    : goodCondition.isGood
      ? 'Good Condition'
      : 'Condition flagged';

  const floodText = !floodSafe.declared
    ? 'Flood n/d'
    : floodSafe.isSafe
      ? 'Flood-Safe'
      : 'Flood Watch';

  const waterText = waterSystem.hasBooster
    ? 'Booster Pump'
    : waterSystem.hasTank
      ? 'Reserve Tank'
      : waterSystem.declared
        ? 'Direct Tap'
        : 'Water n/d';

  const powerText = brownoutResilience.hasSolar
    ? 'Solar'
    : brownoutResilience.hasGenerator
      ? 'Generator'
      : brownoutResilience.declared
        ? 'No Backup'
        : 'Backup n/d';

  const wifiText = wifi.hasWifi
    ? (wifi.downloadMbps > 0 ? `${wifi.downloadMbps} Mbps` : 'Wi-Fi')
    : wifi.declared
      ? 'No Wi-Fi'
      : 'Wi-Fi n/d';

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
        {/* 1. Good Condition (Rain or Shine) */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
            !goodCondition.declared
              ? 'bg-slate-100 text-slate-600 border-slate-200'
              : goodCondition.isGood
                ? 'bg-amber-50 text-amber-900 border-amber-200/70'
                : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
          title={goodCondition.description || goodCondition.displayStatus}
        >
          <CloudSun className={`w-3 h-3 shrink-0 ${goodCondition.declared ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>{conditionText}</span>
        </span>

        {/* 2. Flood Safe */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
          !floodSafe.declared
            ? 'bg-slate-100 text-slate-600 border-slate-200'
            : floodSafe.isSafe
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200/70'
              : 'bg-amber-50 text-amber-900 border-amber-200/70'
        }`}>
          <ShieldCheck className={`w-3 h-3 shrink-0 ${
            !floodSafe.declared ? 'text-slate-400' : floodSafe.isSafe ? 'text-emerald-600' : 'text-amber-600'
          }`} />
          <span>{floodText}</span>
        </span>

        {/* 3. Water System */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
          waterSystem.hasTank || waterSystem.hasBooster
            ? 'bg-sky-50 text-sky-900 border-sky-200/70'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <Droplets className={`w-3 h-3 shrink-0 ${
            waterSystem.hasTank || waterSystem.hasBooster ? 'text-sky-600' : 'text-slate-400'
          }`} />
          <span>{waterText}</span>
        </span>

        {/* 4. Brownout Resilience */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
          brownoutResilience.hasBackup
            ? 'bg-amber-50 text-amber-900 border-amber-200/70'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          <Zap className={`w-3 h-3 shrink-0 ${
            brownoutResilience.hasBackup ? 'text-amber-600 fill-amber-600' : 'text-slate-400'
          }`} />
          <span>{powerText}</span>
        </span>

        {/* 6. Wi-Fi */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${
          wifi.hasWifi ? 'bg-indigo-50 text-indigo-900 border-indigo-200/70' : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          <Wifi className={`w-3 h-3 shrink-0 ${wifi.hasWifi ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>{wifiText}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Branded Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
            Student Reality Checklist
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
        </div>
      </div>

      {/* Verified Banner Callout when audited */}
      {isUriosVerified && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-300/80 text-emerald-950 text-[10.5px] font-bold shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/20 shrink-0" />
            <span className="truncate font-extrabold text-emerald-900">
              {verifiedCount === 6 ? 'All 6 checks audited on-site' : `${verifiedCount}/6 checks audited on-site`}
            </span>
          </div>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-700 text-white shrink-0 tracking-wider">
            FSUU PASS
          </span>
        </div>
      )}

      {/* Grid: 4 Core Reality Checklist Badges */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-semibold">
        {/* 1. Good Condition (Rain or Shine) */}
        <div
          className={`flex items-center gap-1.5 p-2 rounded-xl border min-w-0 ${
            !goodCondition.declared
              ? 'bg-slate-100/80 text-slate-600 border-slate-200'
              : goodCondition.isGood
                ? 'bg-amber-50/70 text-amber-950 border-amber-200/80'
                : 'bg-rose-50/70 text-rose-900 border-rose-200'
          }`}
          title={goodCondition.description || goodCondition.displayStatus}
        >
          <CloudSun className={`w-3.5 h-3.5 shrink-0 ${goodCondition.declared ? 'text-amber-600' : 'text-slate-400'}`} />
          <span className="truncate font-bold">
            {goodCondition.declared ? goodCondition.displayStatus : 'Condition not declared'}
          </span>
        </div>

        {/* 2. Flood Safe Zone */}
        <div className={`flex items-center gap-1.5 p-2 rounded-xl border min-w-0 ${
          !floodSafe.declared
            ? 'bg-slate-100/80 text-slate-600 border-slate-200'
            : floodSafe.isSafe
              ? 'bg-emerald-50/70 text-emerald-950 border-emerald-100'
              : 'bg-amber-50/70 text-amber-950 border-amber-200'
        }`}>
          <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${
            !floodSafe.declared ? 'text-slate-400' : floodSafe.isSafe ? 'text-emerald-600' : 'text-amber-600'
          }`} />
          <span className="truncate">
            {!floodSafe.declared
              ? 'Flood safety not declared'
              : floodSafe.elevation || floodSafe.displayBadge}
          </span>
        </div>

        {/* 3. Water System */}
        <div className={`flex items-center gap-1.5 p-2 rounded-xl border min-w-0 ${
          waterSystem.hasTank || waterSystem.hasBooster
            ? 'bg-sky-50/70 text-sky-950 border-sky-100'
            : 'bg-slate-100/80 text-slate-700 border-slate-200'
        }`}>
          <Droplets className={`w-3.5 h-3.5 shrink-0 ${
            waterSystem.hasTank || waterSystem.hasBooster ? 'text-sky-600' : 'text-slate-400'
          }`} />
          <span className="truncate">
            {!waterSystem.declared
              ? 'Water system not declared'
              : waterSystem.hasBooster
                ? '24/7 Booster Water'
                : waterSystem.hasTank
                  ? (waterSystem.capacity || 'Reserve Tank')
                  : 'Direct Tap (No Tank)'}
          </span>
        </div>

        {/* 4. Brownout Resilience */}
        <div className={`flex items-center gap-1.5 p-2 rounded-xl border min-w-0 ${
          brownoutResilience.hasBackup
            ? 'bg-amber-50/70 text-amber-950 border-amber-200/80'
            : 'bg-slate-100/80 text-slate-700 border-slate-200'
        }`}>
          <Zap className={`w-3.5 h-3.5 shrink-0 ${
            brownoutResilience.hasBackup ? 'text-amber-600 fill-amber-600' : 'text-slate-400'
          }`} />
          <span className="truncate">
            {!brownoutResilience.declared
              ? 'Backup power not declared'
              : brownoutResilience.hasSolar
                ? 'Solar Hallway Backup'
                : brownoutResilience.hasGenerator
                  ? 'Standby Generator'
                  : 'Standard Grid (No Backup)'}
          </span>
        </div>
      </div>

      {/* Connectivity & Signal Box: Wi-Fi + Mobile Carriers */}
      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          {/* 6. Wi-Fi Speed */}
          <div className={`flex items-center gap-1.5 font-bold ${wifi.hasWifi ? 'text-slate-900' : 'text-slate-500'}`}>
            <Wifi className={`w-3.5 h-3.5 shrink-0 ${wifi.hasWifi ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span className="truncate">
              {!wifi.declared
                ? 'Wi-Fi not declared'
                : wifi.hasWifi
                  ? (wifi.downloadMbps > 0 ? `${wifi.downloadMbps} Mbps Fiber Wi-Fi` : 'Wi-Fi provided (speed not measured)')
                  : 'No In-House Wi-Fi (Use Mobile Data)'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
            {wifi.hasWifi ? wifi.provider.split(' ')[0] : wifi.declared ? 'None' : '—'}
          </span>
        </div>

        {/* 5. Mobile Data Carrier In-Room Signals */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
          <div className="flex items-center gap-1 font-semibold text-slate-500 shrink-0">
            <Signal className="w-3 h-3 text-slate-400" />
            <span>In-Room SIM:</span>
          </div>
          <div className="flex items-center gap-1 font-extrabold shrink-0">
            {[
              { carrier: mobileData.dito, name: 'DITO', tone: 'bg-rose-100/70 text-rose-800 border-rose-200' },
              { carrier: mobileData.smart, name: 'Smart', tone: 'bg-emerald-100/70 text-emerald-800 border-emerald-200' },
              { carrier: mobileData.globe, name: 'Globe', tone: 'bg-blue-100/70 text-blue-800 border-blue-200' }
            ].map(({ carrier, name, tone }) => (
              <span
                key={name}
                className={`px-1.5 py-0.5 rounded border text-[9.5px] ${
                  carrier.declared ? tone : 'bg-white text-slate-400 border-slate-200'
                }`}
                title={carrier.declared ? `${name}: ${carrier.text}` : `${name}: no signal measured yet`}
              >
                {name} {carrier.declared ? (carrier.is5G ? '5G' : '4G') : 'n/d'}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
