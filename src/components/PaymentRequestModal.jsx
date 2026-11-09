import React from 'react';
import {
  X,
  Wallet,
  Send,
  CheckCircle2,
  AlertCircle,
  Users,
  Calendar,
  CreditCard,
  FileText,
  Building2,
  ReceiptText
} from 'lucide-react';
import { api } from '../services/api';
import {
  PAYMENT_CATEGORIES,
  PAYMENT_METHODS,
  addDaysISO,
  currentPeriodLabel,
  defaultAmountForCategory,
  defaultTitleForCategory,
  formatPeso,
  todayISO
} from '../utils/payments';

function tenantName(tenant) {
  const student = tenant?.student || tenant || {};
  return student.name || tenant?.studentName || 'Student';
}

function tenantUserId(tenant) {
  return tenant?.userId || tenant?.student?.id || '';
}

/**
 * Landlord modal for issuing a payment request, or recording money that was
 * already received (cash / external transfer) and issuing the receipt now.
 */
export default function PaymentRequestModal({
  isOpen,
  property,
  tenants = [],
  initialTenantId = '',
  initialMode = 'request',
  onClose,
  onSaved
}) {
  const [tenantList, setTenantList] = React.useState(tenants);
  const [mode, setMode] = React.useState('request'); // 'request' | 'record'
  const [tenantId, setTenantId] = React.useState('');
  const [category, setCategory] = React.useState('Rent');
  const [title, setTitle] = React.useState('Monthly Rent');
  const [amount, setAmount] = React.useState('');
  const [dueDate, setDueDate] = React.useState(addDaysISO(7));
  const [paidDate, setPaidDate] = React.useState(todayISO());
  const [periodLabel, setPeriodLabel] = React.useState(currentPeriodLabel());
  const [description, setDescription] = React.useState('');
  const [payTo, setPayTo] = React.useState('');
  const [method, setMethod] = React.useState('Cash');
  const [referenceNumber, setReferenceNumber] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loadingTenants, setLoadingTenants] = React.useState(false);

  // Reset the form each time the modal opens (or switches pad).
  React.useEffect(() => {
    if (!isOpen || !property) return;

    const monthly = Number(property.price) || 0;
    const period = currentPeriodLabel();

    setMode(initialMode === 'record' ? 'record' : 'request');
    setCategory('Rent');
    setTitle(defaultTitleForCategory('Rent', period));
    setAmount(monthly > 0 ? String(monthly) : '');
    setDueDate(addDaysISO(7));
    setPaidDate(todayISO());
    setPeriodLabel(period);
    setDescription('');
    setPayTo(property.landlord?.phone || '');
    setMethod('Cash');
    setReferenceNumber('');
    setError('');
    setTenantList(Array.isArray(tenants) ? tenants : []);
    setTenantId(initialTenantId || tenantUserId(tenants?.[0]) || '');
  }, [isOpen, property?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fall back to fetching the tenant registry when the parent did not pass it.
  React.useEffect(() => {
    if (!isOpen || !property?.id || (tenants && tenants.length > 0)) return;

    let cancelled = false;
    setLoadingTenants(true);
    api.getTenantsByProperty(property.id)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data) ? res.data : [];
        setTenantList(rows);
        setTenantId((current) => current || tenantUserId(rows[0]) || '');
      })
      .catch(() => {
        if (!cancelled) setTenantList([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTenants(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, property?.id, tenants]);

  if (!isOpen || !property) return null;

  const selectedTenant = tenantList.find((tenant) => tenantUserId(tenant) === tenantId) || null;
  const monthly = Number(property.price) || 0;

  const handleCategoryChange = (nextCategory) => {
    setCategory(nextCategory);
    const nextTitle = defaultTitleForCategory(nextCategory, periodLabel);
    setTitle(nextTitle);
    const nextAmount = defaultAmountForCategory(nextCategory, monthly);
    setAmount(nextAmount > 0 ? String(nextAmount) : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!selectedTenant) {
      setError('Choose the tenant this payment is for.');
      return;
    }
    if (!(Number(amount) > 0)) {
      setError('Enter a payment amount greater than zero.');
      return;
    }

    const payload = {
      propertyId: property.id,
      tenancyId: selectedTenant.id || null,
      studentId: tenantUserId(selectedTenant),
      studentName: tenantName(selectedTenant),
      propertyName: property.name,
      roomNumber: selectedTenant.roomNumber || '',
      title: title.trim(),
      category,
      amount: Number(amount),
      dueDate,
      periodLabel: periodLabel.trim(),
      description: description.trim(),
      payTo: payTo.trim(),
      method,
      referenceNumber: referenceNumber.trim(),
      paidAt: paidDate
    };

    setSubmitting(true);
    try {
      const res = mode === 'record'
        ? await api.recordManualPayment(payload)
        : await api.createPaymentRequest(payload);

      onSaved?.(res);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not save the payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[68] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 my-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0b1a30] via-[#12284c] to-[#1a3a6b] text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                {mode === 'record' ? <ReceiptText className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Landlord Ledger</p>
                <h3 className="font-black text-lg leading-tight">
                  {mode === 'record' ? 'Record a Payment' : 'New Payment Request'}
                </h3>
                <p className="text-[11px] text-blue-200 mt-0.5 flex items-center gap-1 truncate">
                  <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                  {property.name}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[74dvh] overflow-y-auto">
          {/* Mode */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setMode('request')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                mode === 'request' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              Request Payment
            </button>
            <button
              type="button"
              onClick={() => setMode('record')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                mode === 'record' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Already Received
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-snug">
            {mode === 'record'
              ? 'Use this when the student already paid in cash or outside the app. The official receipt is issued immediately.'
              : 'The tenant sees this bill in My Room with a Pay button. A receipt is issued only after you verify their payment.'}
          </p>

          {/* Tenant */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
              Billing tenant <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                disabled={loadingTenants || tenantList.length === 0}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-50"
                required
              >
                {tenantList.length === 0 ? (
                  <option value="">{loadingTenants ? 'Loading tenants…' : 'No active tenants yet'}</option>
                ) : (
                  tenantList.map((tenant) => (
                    <option key={tenant.id} value={tenantUserId(tenant)}>
                      {tenantName(tenant)} · {tenant.roomNumber || 'Room TBD'}
                    </option>
                  ))
                )}
              </select>
            </div>
            {tenantList.length === 0 && !loadingTenants && (
              <p className="text-[10px] text-amber-700 mt-1">
                Approve a boarder application first — only active tenants can be billed.
              </p>
            )}
          </div>

          {/* Category + amount */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Charge type</label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                {PAYMENT_CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                Amount (₱) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Payment title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Monthly Rent — November 2026"
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Billing period</label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="e.g. November 2026"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                {mode === 'record' ? 'Date received' : 'Due date'}
              </label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={mode === 'record' ? paidDate : dueDate}
                  onChange={(e) => (mode === 'record' ? setPaidDate(e.target.value) : setDueDate(e.target.value))}
                  className="w-full pl-8 pr-2 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
              Note for the tenant <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="e.g. Includes ₱300 water share for October."
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {mode === 'request' ? (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                GCash / bank details shown to the tenant
              </label>
              <input
                type="text"
                value={payTo}
                onChange={(e) => setPayTo(e.target.value)}
                placeholder="e.g. 0917 123 4567 (GCash)"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">Paid via</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {PAYMENT_METHODS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500 mb-1">
                  Reference <span className="text-slate-400">(optional)</span>
                </label>
                <div className="relative">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="GCash / OR no."
                    className="w-full pl-8 pr-2 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-800 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Tenant will see
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{title || 'Payment title'}</p>
                <p className="text-[10px] text-slate-500 truncate">
                  {selectedTenant ? tenantName(selectedTenant) : 'No tenant'} · {periodLabel || 'No period'}
                </p>
              </div>
              <p className="font-black text-slate-900 text-sm shrink-0">{formatPeso(Number(amount) || 0)}</p>
            </div>
            <p className="text-[10px] text-blue-800 mt-1">
              {mode === 'record'
                ? 'Marked paid immediately and an official receipt is issued.'
                : `Due ${dueDate} · student pays, then you verify.`}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || tenantList.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-black transition-colors disabled:opacity-50 cursor-pointer"
            >
              {mode === 'record' ? <ReceiptText className="w-3.5 h-3.5 text-amber-400" /> : <Send className="w-3.5 h-3.5 text-amber-400" />}
              <span>
                {submitting
                  ? 'Saving...'
                  : mode === 'record'
                    ? 'Record Payment & Issue Receipt'
                    : 'Send Payment Request'}
              </span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
