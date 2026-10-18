import React, { useState } from 'react';
import { X, Share2, Copy, Check, ShieldCheck, Heart, Phone, MapPin, Eye, Lock } from 'lucide-react';

export default function ParentShareModal({ property, onClose }) {
  if (!property) return null;

  const [copied, setCopied] = useState(false);

  const messengerSummary = `🏠 BALAY URIOS - STUDENT HOUSING SAFETY SUMMARY FOR PARENTS

Property: ${property.name}
Location: ${property.area} (Near FSUU Main San Francisco Gate)
Monthly Rent: ₱${property.price.toLocaleString()} (${property.priceSubtext})

🛡️ SAFETY & SECURITY CHECKS (VERIFIED ON-SITE):
• Security: 24/7 Hallway CCTV & Gated Perimeter with Caretaker
• Curfew: Strictly enforced (10:00 PM Gate lock)
• Water: 1,000L Overhead Stainless Tank + Auto Booster Pump (No dry mornings)
• Power: Solar-powered emergency hallway lights & charging station during blackouts
• Flood Safety: +2.4m elevated zone, 100% dry walking path to FSUU during typhoons

👩‍💼 VERIFIED LANDLORD:
• Host: ${property.landlord.name} (${property.landlord.tag})
• Contact: ${property.landlord.phone}
• Experience: ${property.landlord.experience}

💰 FSUU ESCROW DEPOSIT PROTECTION:
Advance deposit is securely held by Balay Urios until your student moves in and inspects the room key.

View Full Verified Inspection Report:
https://balayurios.ph/pads/${property.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messengerSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                "Parent Peace-of-Mind" Summary
              </h3>
              <p className="text-xs text-slate-500">
                Clean, safety-first summary ready to send to parents or guardians
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Safety Highlights Card for Parents */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-300">
              Verified Parent Safety Card
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
              ✓ Passed Safety QA
            </span>
          </div>

          <div>
            <h4 className="text-base font-extrabold text-white">{property.name}</h4>
            <p className="text-xs text-blue-200 mt-0.5">{property.area}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>24/7 CCTV & Gated</span>
            </div>
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>10 PM Gate Curfew</span>
            </div>
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>+2.4m Flood Safe</span>
            </div>
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-xs flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Resident Caretaker</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] text-blue-300 font-semibold">Verified Landlord</p>
              <p className="font-bold text-white">{property.landlord.name}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-blue-300 font-semibold">Contact</p>
              <p className="font-mono text-white text-[11px]">{property.landlord.phone}</p>
            </div>
          </div>
        </div>

        {/* Messenger Format Preview */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Messenger / SMS Formatted Text:</span>
            <span className="text-[11px] text-blue-600 font-normal">Pre-formatted for quick copy</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
            {messengerSummary}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy for Messenger / SMS</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
