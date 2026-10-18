import React, { useState } from 'react';
import { X, Calendar, Clock, Check, ShieldCheck, User } from 'lucide-react';

export default function ScheduleVisitModal({ property, onClose }) {
  if (!property) return null;

  const [date, setDate] = useState('2026-10-21');
  const [timeSlot, setTimeSlot] = useState('11:30 AM - 12:30 PM (Class Break)');
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [course, setCourse] = useState('BS Nursing');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Calendar className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Schedule Pad Ocular Visit
              </h3>
              <p className="text-xs text-slate-500">
                Visit with landlord {property.landlord.name}
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

        {isSuccess ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-black text-slate-900">Ocular Visit Confirmed!</h4>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              We notified <span className="font-bold">{property.landlord.name}</span>. An SMS confirmation slip with the caretaker contact has been sent to your phone.
            </p>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1">
              <p><span className="text-slate-500">Date & Time:</span> <span className="font-bold text-slate-800">{date} • {timeSlot}</span></p>
              <p><span className="text-slate-500">Location:</span> <span className="font-bold text-slate-800">{property.area}</span></p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-700">Preferred Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Convenient Time Slot</label>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
              >
                <option>08:00 AM - 09:30 AM (Before Class)</option>
                <option>11:30 AM - 12:30 PM (Class Break)</option>
                <option>01:30 PM - 03:00 PM (Afternoon Vacant)</option>
                <option>04:30 PM - 06:00 PM (After Class Dismissal)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700">Student Name</label>
                <input
                  type="text"
                  placeholder="Juan Dela Cruz"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Degree / Program</label>
                <input
                  type="text"
                  placeholder="BS Nursing / Accountancy"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="mt-1 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Free ocular visit. No commitment required. The landlady or resident caretaker will tour you through the room, shared CR, and water tank setup.
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-amber-700 hover:bg-amber-800 text-white font-extrabold text-xs transition-colors shadow-sm"
            >
              Confirm Ocular Visit Request
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
