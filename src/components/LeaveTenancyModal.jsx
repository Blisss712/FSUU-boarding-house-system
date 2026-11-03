import React, { useState } from 'react';
import { 
  X, 
  DoorOpen, 
  ShieldCheck, 
  CheckCircle2, 
  Zap, 
  Calendar, 
  FileText, 
  Phone, 
  User, 
  AlertCircle, 
  Check, 
  Receipt
} from 'lucide-react';
import { api } from '../services/api';

export default function LeaveTenancyModal({ tenancy, user, onSuccess, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedVoucher, setCopiedVoucher] = useState(false);

  // Default financial calculations
  const depositAmount = 3800; // 1 Month Security Deposit
  const electricCost = Number(tenancy?.submeterCost) || 588;
  const netRefund = Math.max(0, depositAmount - electricCost);

  // Form state
  const [moveOutDate, setMoveOutDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [reason, setReason] = useState('Graduation / Completing Studies');
  const [refundPhone, setRefundPhone] = useState(user?.phone || '');
  const [refundName, setRefundName] = useState(user?.name || '');
  const [notes, setNotes] = useState('');
  const [agreeSubmeter, setAgreeSubmeter] = useState(true);
  const [agreeKeys, setAgreeKeys] = useState(true);

  // Generated voucher data on success
  const [voucherData, setVoucherData] = useState(null);

  if (!tenancy) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeSubmeter || !agreeKeys) {
      setError('Please acknowledge both clearance conditions to proceed.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const voucherCode = `CLR-${Date.now().toString().slice(-6)}-FSUU`;

      await api.leaveTenancy(tenancy.id, {
        propertyId: tenancy.propertyId,
        moveOutDate,
        reason,
        refundPhone,
        refundName,
        netRefund,
        notes,
        voucherCode
      });

      setVoucherData({
        voucherCode,
        propertyName: tenancy.propertyName,
        roomNumber: tenancy.roomNumber,
        submeterNumber: tenancy.submeterNumber,
        submeterKwh: tenancy.submeterKwh,
        electricCost,
        depositAmount,
        netRefund,
        moveOutDate,
        reason,
        refundPhone,
        refundName,
        timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      });

      setStep('success');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to process move-out transaction.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVoucher = () => {
    if (!voucherData) return;
    const text = `📋 BALAY URIOS - TENANCY CLEARANCE VOUCHER
Voucher Code: ${voucherData.voucherCode}
Student: ${user?.name || ''} (${user?.course || ''})
Property: ${voucherData.propertyName} (${voucherData.roomNumber})
Planned Departure: ${voucherData.moveOutDate}
Reason: ${voucherData.reason}

💰 FINANCIAL SETTLEMENT SUMMARY:
• Security Deposit Held: ₱${voucherData.depositAmount.toLocaleString()}
• Final Submeter Deduction (${voucherData.submeterKwh} kWh): -₱${voucherData.electricCost.toLocaleString()}
• Net Deposit Refund: ₱${voucherData.netRefund.toLocaleString()}
• Refund Destination: GCash (${voucherData.refundPhone} - ${voucherData.refundName})

Status: Pending Caretaker Room Inspection & Key Handover`;

    navigator.clipboard.writeText(text);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
        
        {/* ======================================================== */}
        {/* MODAL HEADER                                             */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0 shadow-2xs border border-rose-100">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 leading-tight">
                {step === 'form' ? 'Tenancy Departure Transaction' : 'Tenancy Clearance Voucher'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {tenancy.propertyName} • {tenancy.roomNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* STEP 1: FORM & FINANCIAL TRANSACTION BREAKDOWN           */}
        {/* ======================================================== */}
        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-3.5">
            {/* Financial Clearance Breakdown Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0b1a30] to-[#16325c] text-white shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>Escrow Clearance Statement</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  Protected Escrow
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-blue-100/90 pt-1">
                <div className="flex justify-between items-center">
                  <span>Initial Security Deposit Held</span>
                  <span className="font-bold text-white">₱{depositAmount.toLocaleString()}.00</span>
                </div>
                <div className="flex justify-between items-center text-amber-300">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>Submeter Usage ({tenancy.submeterKwh || 42} kWh @ ₱14/kWh)</span>
                  </span>
                  <span className="font-bold">-₱{electricCost.toLocaleString()}.00</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between items-baseline">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-blue-300 block">
                      Estimated Net Refund
                    </span>
                    <span className="text-[10px] text-blue-200/70">Released via GCash upon key handover</span>
                  </div>
                  <span className="text-lg font-black text-emerald-400">
                    ₱{netRefund.toLocaleString()}.00
                  </span>
                </div>
              </div>
            </div>

            {/* Departure Details */}
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span>Intended Move-Out Date</span>
                  </label>
                  <input
                    type="date"
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                    Reason for Departure
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Graduation / Completing Studies">Graduation / Completing Studies</option>
                    <option value="Semester Ended / Vacation Period">Semester Ended / Vacation Period</option>
                    <option value="Transferring to Closer Pad to FSUU">Transferring to Closer Pad to FSUU</option>
                    <option value="Hospital / OJT Clinical Duty outside Butuan">Hospital / OJT Clinical Duty outside Butuan</option>
                    <option value="Switching to Solo / Studio Suite">Switching to Solo / Studio Suite</option>
                    <option value="Financial / Budget Adjustments">Financial / Budget Adjustments</option>
                    <option value="Other Personal Reason">Other Personal Reason</option>
                  </select>
                </div>
              </div>

              {/* Security Deposit Payout GCash Information */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Security Deposit Refund Destination</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    GCash / Bank
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>GCash Phone Number</span>
                    </label>
                    <input
                      type="text"
                      value={refundPhone}
                      onChange={(e) => setRefundPhone(e.target.value)}
                      placeholder="e.g. 0917 888 9999"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>Account Name</span>
                    </label>
                    <input
                      type="text"
                      value={refundName}
                      onChange={(e) => setRefundName(e.target.value)}
                      placeholder="e.g. Full name on account"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Additional notes / forwarding info */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Optional Notes for Landlord or Caretaker
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Leaving on morning of Nov 10. Left room thoroughly cleaned."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 resize-none"
                />
              </div>

              {/* Mandatory Checklist Agreements */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeSubmeter}
                    onChange={(e) => setAgreeSubmeter(e.target.checked)}
                    className="accent-rose-600 w-4 h-4 rounded mt-0.5 shrink-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    I agree to deduct my final verified submeter electric usage (₱{electricCost.toLocaleString()}) from my security deposit.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeKeys}
                    onChange={(e) => setAgreeKeys(e.target.checked)}
                    className="accent-rose-600 w-4 h-4 rounded mt-0.5 shrink-0 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    I will surrender all physical room keys and clear personal items with the on-site caretaker on my departure date.
                  </span>
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Keep Active
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-extrabold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Departure...</span>
                  </>
                ) : (
                  <>
                    <DoorOpen className="w-4 h-4" />
                    <span>Authorize Departure & End Tenancy</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ======================================================== */}
        {/* STEP 2: OFFICIAL CLEARANCE VOUCHER RECEIPT               */}
        {/* ======================================================== */}
        {step === 'success' && voucherData && (
          <div className="space-y-4 pt-3.5 animate-in fade-in duration-200 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Departure Notice Processed
              </span>
              <h4 className="text-lg font-black text-slate-900 mt-1.5">
                Official Room Clearance Voucher
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                Your tenancy pass for {voucherData.propertyName} ({voucherData.roomNumber}) has been concluded. Present this voucher to the caretaker during checkout.
              </p>
            </div>

            {/* Voucher Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Voucher Reference</span>
                  <p className="font-mono font-black text-sm text-[#0b1a30]">{voucherData.voucherCode}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Generated</span>
                  <p className="font-semibold text-slate-700 text-[11px]">{voucherData.timestamp}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block font-medium">Scheduled Move-Out</span>
                  <span className="font-extrabold text-slate-800">{voucherData.moveOutDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Reason</span>
                  <span className="font-extrabold text-slate-800 truncate block">{voucherData.reason}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Submeter Deducted</span>
                  <span className="font-extrabold text-amber-700">₱{voucherData.electricCost.toLocaleString()} ({voucherData.submeterKwh} kWh)</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">GCash Refund</span>
                  <span className="font-extrabold text-emerald-700">₱{voucherData.netRefund.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-500">
                <span>Refund Destination: </span>
                <span className="font-bold text-slate-800">{voucherData.refundPhone}</span>
                <span> ({voucherData.refundName})</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyVoucher}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                {copiedVoucher ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Voucher Copied!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    <span>Copy Voucher Summary</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-[#0b1a30] hover:bg-[#16305a] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Done / Close</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
