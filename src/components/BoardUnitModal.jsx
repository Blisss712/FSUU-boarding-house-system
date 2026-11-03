import React, { useState } from 'react';
import { 
  X, 
  KeyRound, 
  ShieldCheck, 
  User, 
  ArrowRight, 
  Lock,
  DoorOpen
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function BoardUnitModal({ 
  property, 
  user: propUser, 
  onBoardSuccess, 
  onOpenAuth, 
  onClose 
}) {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;

  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null);

  // Form details
  const [roomChoice, setRoomChoice] = useState('Room 201 (Second Floor - Quiet Wing)');
  const [customRoom, setCustomRoom] = useState('');
  const [submeterNumber, setSubmeterNumber] = useState('SM-201');
  const [moveInDate, setMoveInDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [semester, setSemester] = useState('1st Sem 2026-2027');
  const [studentName, setStudentName] = useState(user?.name || '');
  const [studentId, setStudentId] = useState(user?.studentId || '');
  const [course, setCourse] = useState(user?.course || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [agreedToRules, setAgreedToRules] = useState(true);

  if (!property) return null;

  const price = Number(property.price) || 0;
  const securityDeposit = price;
  const advanceRent = price;
  const totalEscrow = securityDeposit + advanceRent;

  const activeRoom = roomChoice === 'custom' ? (customRoom.trim() || 'Room 101') : roomChoice;

  const handleRoomSelect = (val) => {
    setRoomChoice(val);
    if (val.includes('101')) setSubmeterNumber('SM-101');
    else if (val.includes('102')) setSubmeterNumber('SM-102');
    else if (val.includes('201')) setSubmeterNumber('SM-201');
    else if (val.includes('204')) setSubmeterNumber('SM-204');
    else setSubmeterNumber('SM-AUTO');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreedToRules) {
      setError('Please agree to the house rules and boarding contract terms.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.boardProperty({
        propertyId: property.id,
        propertyName: property.name,
        roomNumber: activeRoom,
        submeterNumber: submeterNumber || 'SM-201',
        semester,
        monthlyPrice: price,
        studentName,
        studentCourse: course,
        studentId,
        advanceMonths: 1,
        depositMonths: 1
      });

      if (res?.success) {
        setResultData(res.data);
        setStep('success');
      }
    } catch (err) {
      setError(err.message || 'Failed to complete boarding registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0b1a30] via-[#12284c] to-[#1a3a6b] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white leading-tight">
                {step === 'form' ? 'Apply to Board This Unit' : 'Application Submitted!'}
              </h3>
              <p className="text-[11px] text-blue-200">
                {step === 'form'
                  ? 'Request to become a tenant — the landlord approves first'
                  : 'Awaiting landlord approval'}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {step === 'form' ? (
            <>
              {/* Guard: If user is not logged in */}
              {!user && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <User className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Sign in required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Log in with your student account to board this pad. Tenancy is linked to your real account.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {onOpenAuth && (
                      <button
                        type="button"
                        onClick={() => { onClose(); onOpenAuth('login'); }}
                        className="px-3 py-1.5 rounded-xl bg-[#0b1a30] text-white font-bold text-[11px] hover:bg-[#1a3a6b] cursor-pointer"
                      >
                        Sign In / Register
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Guard: If user is a Landlord */}
              {user?.role === 'landlord' && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    Landlord accounts cannot register as active room boarders. Switch to a student profile to test room boarding.
                  </span>
                </div>
              )}

              {/* Property Mini Summary Card */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <img
                  src={property.images?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80'}
                  alt={property.name}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase text-blue-700 tracking-wider">
                    {property.zone || 'Zone not specified'} • {property.gender || '—'}
                  </span>
                  <h4 className="font-black text-sm text-slate-900 truncate">{property.name}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{property.area}</p>
                  <p className="text-xs font-black text-[#0b1a30] mt-0.5">
                    ₱{price.toLocaleString()}<span className="text-[10px] font-normal text-slate-400">/month</span>
                  </p>
                </div>
              </div>

              {/* Boarding Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                
                {/* 1. Room Selection */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1">
                    Select Available Room / Bedspace
                  </label>
                  <select
                    value={roomChoice}
                    onChange={(e) => handleRoomSelect(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Room 201 (Second Floor - Quiet Wing)">Room 201 (Second Floor - Quiet Wing)</option>
                    <option value="Room 204 (Second Floor - Corner Room)">Room 204 (Second Floor - Corner Room)</option>
                    <option value="Room 101 (Ground Floor - Standard)">Room 101 (Ground Floor - Standard)</option>
                    <option value="Room 102 (Ground Floor - Near Dining)">Room 102 (Ground Floor - Near Dining)</option>
                    <option value="custom">Other / Custom Room Assignment...</option>
                  </select>

                  {roomChoice === 'custom' && (
                    <input
                      type="text"
                      placeholder="e.g. Room 302 (3rd Floor Bedspace A)"
                      value={customRoom}
                      onChange={(e) => setCustomRoom(e.target.value)}
                      className="w-full mt-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                      required
                    />
                  )}
                </div>

                {/* 2. Target Move-In Date & Semester */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1">
                      Target Move-in Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={moveInDate}
                        onChange={(e) => setMoveInDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 mb-1">
                      Academic Semester
                    </label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="1st Sem 2026-2027">1st Sem 2026-2027</option>
                      <option value="2nd Sem 2026-2027">2nd Sem 2026-2027</option>
                      <option value="Summer Term 2026">Summer Term 2026</option>
                    </select>
                  </div>
                </div>

                {/* 3. Boarder Details */}
                <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2">
                  <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider block">
                    Registered Boarder Profile
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Student Name</label>
                      <input
                        type="text"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Course & Year</label>
                      <input
                        type="text"
                        value={course}
                        onChange={(e) => setCourse(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Student ID</label>
                      <input
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mobile Phone</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Financial Escrow Summary */}
                <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] text-blue-200">
                    <span>1 Month Advance Rent:</span>
                    <span className="font-bold text-white">₱{advanceRent.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-blue-200">
                    <span>1 Month Security Deposit (Refundable):</span>
                    <span className="font-bold text-white">₱{securityDeposit.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-blue-200">
                    <span>Submeter Electric Initial Balance:</span>
                    <span className="font-bold text-emerald-400">₱0 (0 kWh usage)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between font-black text-xs">
                    <span className="text-amber-300">Total Move-In Escrow:</span>
                    <span className="text-base text-amber-400">₱{totalEscrow.toLocaleString()}</span>
                  </div>
                </div>

                {/* Escrow Guarantee Pill */}
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong>Approval required:</strong> Your application goes to {property.landlord?.name || 'the landlord'} for approval. You only become a tenant — and escrow only applies — once the landlord approves your request.
                  </p>
                </div>

                {/* House Rules Agreement */}
                <label className="flex items-start gap-2 cursor-pointer select-none pt-1">
                  <input
                    type="checkbox"
                    checked={agreedToRules}
                    onChange={(e) => setAgreedToRules(e.target.checked)}
                    className="accent-[#0b1a30] w-4 h-4 rounded mt-0.5"
                    required
                  />
                  <span className="text-[11px] text-slate-600 font-medium">
                    I agree to the {property.name} house rules (curfew schedules, submeter rate at ₱14/kWh) and FSUU Student Conduct Code.
                  </span>
                </label>

                {error && (
                  <p className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-xs">
                    ⚠️ {error}
                  </p>
                )}

                {/* Actions */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || (user?.role === 'landlord')}
                    className="w-2/3 py-2.5 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] disabled:opacity-50 text-white font-extrabold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span>{loading ? 'Submitting Application...' : 'Submit Boarding Application'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            /* ======================================================== */
            /* STEP 2: APPLICATION SUBMITTED — PENDING LANDLORD APPROVAL */
            /* ======================================================== */
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                  Application Pending Approval
                </span>
                <h4 className="text-xl font-black text-slate-900 mt-2">
                  Request Sent to the Landlord
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                  Your application to board <strong>{property.name}</strong> has been submitted. The landlord will review it and approve you as a tenant. Your tenancy pass activates only after approval.
                </p>
              </div>

              {/* Pending Application Summary Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0b1a30] to-[#1a3a6b] text-white text-left space-y-2 shadow-md">
                <div className="flex items-center justify-between text-[10px] font-bold text-blue-300 uppercase tracking-wider">
                  <span>Application Reference</span>
                  <span className="text-amber-400">{resultData?.tenancy?.id || 'AWAITING-APPROVAL'}</span>
                </div>
                <div className="border-t border-white/10 pt-2">
                  <h5 className="font-extrabold text-base text-white">{property.name}</h5>
                  <p className="text-xs text-blue-200">{activeRoom} • Submeter #{submeterNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-blue-300 block">Boarder Name</span>
                    <span className="font-bold text-white">{studentName}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/10">
                    <span className="text-[10px] text-blue-300 block">Status</span>
                    <span className="font-bold text-amber-300">Pending Landlord Approval</span>
                  </div>
                </div>
              </div>

              {/* Next Steps CTA */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    onBoardSuccess?.(resultData?.tenancy);
                  }}
                  className="w-full py-3 rounded-2xl bg-[#0b1a30] hover:bg-[#1a3a6b] text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <DoorOpen className="w-4 h-4 text-amber-400" />
                  <span>View My Application Status</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
