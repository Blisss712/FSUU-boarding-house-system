import React from 'react';
import {
  X,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Building2,
  Smartphone,
  Landmark,
  Banknote,
  Send,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import {
  PAYMENT_METHODS,
  formatPeso,
  formatPaymentDate,
  getPaymentCategory,
  getPaymentMethod,
  todayISO
} from '../utils/payments';

const METHOD_ICONS = {
  GCash: Smartphone,
  'Bank Transfer': Landmark,
  Cash: Banknote,
  'Balay Urios Escrow': ShieldCheck
};

export default function PayNowModal({ payment, property, onClose, onPaid }) {
  const [method, setMethod] = React.useState(payment?.method || 'GCash');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [note, setNote] = React.useState('');
  const [paidDate, setPaidDate] = React.useState(todayISO());
  const [agree, setAgree] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(null);
  const [copied, setCopied] = React.useState(false);

  if (!payment) return null;

  const category = getPaymentCategory(payment.category);
  const selectedMethod = getPaymentMethod(method);
  const landlordName = property?.landlord?.name || 'your landlord';
  const payTo = payment.payTo || property?.landlord?.phone || '';
  const requiresReference = selectedMethod?.requiresReference !== false;
  const amount = Number(payment.amount) || 0;

  const handleCopy = async () => {
    if (!payTo) return;
    try {
      await navigator.clipboard.writeText(payTo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be blocked; the number is on screen.
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agree) {
      setError('Please confirm that you have sent this payment before submitting.');
      return;
    }
    if (requiresReference && !referenceNumber.trim()) {
      setError('Enter the GCash / bank reference number so your landlord can verify it.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitPayment(payment.id, {
        method,
        referenceNumber: referenceNumber.trim(),
        note: note.trim(),
        paidAt: paidDate
      });

      setSuccess(res?.data || { ...payment, method, referenceNumber, status: 'awaiting_verification' });
      onPaid?.(res?.data || null);
    } catch (err) {
      setError(err.message || 'Could not submit this payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 my-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0b1a30] via-[#12284c] to-[#1a3a6b] text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Secure Rent Payment</p>
                <h3 className="font-black text-lg leading-tight">
                  {success ? 'Payment Submitted' : 'Pay Your Landlord'}
                </h3>
                <p className="text-[11px] text-blue-200 mt-0.5 truncate">
                  {payment.propertyName || property?.name || 'Boarding house'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {success ? (
          <div className="p-5 space-y-4">
            <div className="text-center space-y-2 py-2">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-black text-lg text-slate-900">Payment sent for verification</h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                {landlordName} will confirm the payment. Once verified, your official
                receipt appears in this tab automatically.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 divide-y divide-dashed divide-slate-200 overflow-hidden text-xs">
              <div className="flex justify-between gap-2 p-3">
                <span className="text-slate-500">Amount</span>
                <span className="font-black text-slate-900">{formatPeso(amount)}</span>
              </div>
              <div className="flex justify-between gap-2 p-3">
                <span className="text-slate-500">Method</span>
                <span className="font-bold text-slate-800">{method}</span>
              </div>
              {referenceNumber && (
                <div className="flex justify-between gap-2 p-3">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono font-bold text-slate-800 break-all text-right">{referenceNumber}</span>
                </div>
              )}
              <div className="flex justify-between gap-2 p-3">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Awaiting verification
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-black transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[74dvh] overflow-y-auto">
            {/* Amount */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-800">Amount to pay</p>
              <p className="font-black text-3xl text-slate-900 mt-1">{formatPeso(amount)}</p>
              <p className="text-[11px] text-amber-900 font-semibold mt-1">{payment.title}</p>
              <div className="flex items-center justify-center gap-1.5 mt-1 text-[10px] text-amber-800">
                <span className="px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 font-bold">{category.label}</span>
                {payment.dueDate && (
                  <span className="px-2 py-0.5 rounded-full bg-white/70 border border-amber-200 font-bold">
                    Due {formatPaymentDate(payment.dueDate)}
                  </span>
                )}
              </div>
            </div>

            {/* Pay-to card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-blue-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400">Pay to</p>
                <p className="text-sm font-black text-slate-900 truncate">{landlordName}</p>
                {payTo ? (
                  <p className="text-[11px] text-slate-600 font-mono truncate">{payTo}</p>
                ) : (
                  <p className="text-[10px] text-amber-700">Ask your landlord for the GCash / bank details in chat.</p>
                )}
              </div>
              {payTo && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  title="Copy payment details"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              )}
            </div>

            {/* Method */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1.5">How did you pay?</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PAYMENT_METHODS.map((option) => {
                  const Icon = METHOD_ICONS[option.value] || Wallet;
                  const active = method === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMethod(option.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-left ${
                        active
                          ? 'bg-[#0b1a30] text-white border-[#0b1a30] shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
                      }`}
                      title={option.hint}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">{selectedMethod?.hint}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                  Reference no. {requiresReference ? <span className="text-rose-500">*</span> : <span className="text-slate-400">(optional)</span>}
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={requiresReference ? 'e.g. 0123456789012' : 'e.g. CASH-001'}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Date paid</label>
                <input
                  type="date"
                  value={paidDate}
                  max={todayISO()}
                  onChange={(e) => setPaidDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                Note for your landlord <span className="text-slate-400">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="e.g. Sent from my GCash account ending in 1234."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>

            <label className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#0b1a30] shrink-0"
              />
              <span className="text-[11px] text-slate-600 leading-snug">
                I confirm I sent <strong className="text-slate-900">{formatPeso(amount)}</strong> to{' '}
                <strong className="text-slate-900">{landlordName}</strong> using {method}. I understand the
                receipt is issued only after the landlord verifies this payment.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-black transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>{submitting ? 'Submitting...' : 'Submit Payment for Verification'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Your reference is only visible to you and your landlord.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
