import React from 'react';
import { 
  X, 
  GraduationCap, 
  Building2, 
  DoorOpen, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin, 
  HeartHandshake, 
  ShieldCheck, 
  MessageCircle
} from 'lucide-react';

export default function StudentProfileModal({ 
  isOpen, 
  tenant, 
  property, 
  onClose, 
  onOpenChat 
}) {
  if (!isOpen || !tenant) return null;

  const student = tenant.student || tenant;
  const name = student.name || tenant.studentName || 'Student Boarder';
  const course = student.course || tenant.course || '';
  const yearLevel = student.yearLevel || tenant.yearLevel || '';
  const studentId = student.studentId || tenant.studentId || '';
  const email = student.email || '';
  const phone = student.phone || '';
  const roomNumber = tenant.roomNumber || '';
  const submeterNumber = tenant.submeterNumber || '';
  const submeterKwh = tenant.submeterKwh ?? 0;
  const submeterCost = tenant.submeterCost ?? 0;
  const nextRentDue = tenant.nextRentDue || '';
  const semester = tenant.semester || '';
  const parentName = student.parentName || '';
  const parentRelation = student.parentRelation || '';
  const parentPhone = student.parentPhone || '';
  const parentCity = student.parentCity || '';
  const emergencyNotes = student.emergencyNotes || '';
  const initials = student.avatarInitials || (name ? name.substring(0, 2).toUpperCase() : 'ST');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header Hero Banner */}
        <div className="p-6 bg-gradient-to-br from-[#0b1a30] via-[#12284c] to-[#1c3f76] text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-[#0b1a30] font-black text-xl flex items-center justify-center shadow-lg border-2 border-white/20">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0b1a30]" title="Active Registered Tenant" />
            </div>

            {/* Title & Program */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-xl text-white truncate">{name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Active Boarder</span>
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold text-white">{course}</span>
                <span>•</span>
                <span>{yearLevel}</span>
              </p>
              <p className="text-[11px] text-blue-300 font-mono mt-0.5">
                ID: {studentId} • FSUU Urios Verified
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Body Details */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* Room Assignment & Utility Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-600" />
                <span>Room Assignment & Tenancy</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-200">
                {semester}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-700">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Room</p>
                <p className="font-black text-sm text-[#0b1a30] mt-0.5 flex items-center gap-1">
                  <DoorOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>{roomNumber}</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Next Rent Due</p>
                <p className="font-black text-sm text-amber-700 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>{nextRentDue}</span>
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Dedicated Submeter</p>
                    <p className="font-extrabold text-xs text-slate-800 mt-0.5">
                      Submeter {submeterNumber} • {submeterKwh} kWh consumed
                    </p>
                  </div>
                  <span className="font-black text-sm text-blue-900">
                    ₱{Number(submeterCost).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Student Direct Contact */}
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Phone className="w-3 h-3 text-blue-600" />
              <span>Student Contact Details</span>
            </span>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-slate-800">{phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${phone.replace(/\s+/g, '')}`}
                    className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 text-[10px] font-extrabold border border-blue-200 transition-colors"
                  >
                    Call
                  </a>
                  <a
                    href={`sms:${phone.replace(/\s+/g, '')}`}
                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[10px] font-extrabold border border-emerald-200 transition-colors"
                  >
                    SMS
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span className="font-medium text-slate-800 truncate">{email}</span>
              </div>
            </div>
          </div>

          {/* Parent & Emergency Contact Card */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1">
                <HeartHandshake className="w-3 h-3 text-amber-700" />
                <span>Parent / Emergency Contact</span>
              </span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                Verified Guardian
              </span>
            </div>

            <div className="space-y-1.5 text-amber-950">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-xs text-amber-950">{parentName}</p>
                  <p className="text-[11px] text-amber-800">Relationship: <span className="font-semibold">{parentRelation}</span></p>
                </div>
                <a
                  href={`tel:${parentPhone.replace(/\s+/g, '')}`}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] shadow-2xs transition-colors"
                >
                  Call Guardian
                </a>
              </div>

              <div className="pt-1 border-t border-amber-200/60 flex items-center gap-1.5 text-[11px] text-amber-800">
                <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                <span>Hometown Origin: <strong>{parentCity}</strong></span>
              </div>

              {emergencyNotes && (
                <div className="p-2 rounded-xl bg-white/70 border border-amber-200/60 text-[10.5px] text-amber-900 leading-relaxed">
                  <span className="font-bold">Medical / Conduct Note:</span> {emergencyNotes}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>FSUU Escrow-Protected Tenant</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChat && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenChat({
                    ...property,
                    targetStudent: {
                      id: student.id || tenant.userId,
                      name,
                      roomNumber
                    }
                  });
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Message Student</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
