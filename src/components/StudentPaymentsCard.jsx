import React from 'react';
import {
  Wallet,
  ReceiptText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Building2,
  CreditCard,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import PayNowModal from './PayNowModal';
import ReceiptModal from './ReceiptModal';
import {
  buildReceiptHistory,
  formatPeso,
  formatPaymentDate,
  getPaymentCategory,
  getPaymentStatus,
  isPaymentOverdue,
  paymentAmount,
  sortPaymentsByDue,
  summarizePayments
} from '../utils/payments';

/**
 * Student-facing "Rent & Payments" card.
 *
 * Shows outstanding invoices first, then the official receipt history. A
 * payment only produces a receipt after the landlord verifies it.
 */
export default function StudentPaymentsCard({
  payments = [],
  receipts = [],
  property,
  user,
  onRefresh,
  setupError = ''
}) {
  const [tab, setTab] = React.useState('dues');
  const [payingPayment, setPayingPayment] = React.useState(null);
  const [viewingReceipt, setViewingReceipt] = React.useState(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const summary = summarizePayments(payments);
  const duePayments = sortPaymentsByDue(
    payments.filter((payment) => ['pending', 'rejected'].includes(payment.status))
  );
  const awaitingPayments = sortPaymentsByDue(
    payments.filter((payment) => payment.status === 'awaiting_verification')
  );
  const openCount = duePayments.length + awaitingPayments.length;
  const history = buildReceiptHistory(payments, receipts);
  const landlord = property?.landlord || null;

  const handlePaid = () => {
    onRefresh?.();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-sm text-slate-900 leading-tight">Rent & Payments</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pay your landlord in-app and keep every official receipt.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-800 hover:bg-blue-50 border border-transparent hover:border-blue-200 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh payment status and receipts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            GCash / Escrow
          </span>
        </div>
      </div>

      {setupError && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{setupError}</span>
        </div>
      )}

      {/* Summary tiles */}
      <div className="grid grid-cols-3 gap-2">
        <SummaryTile
          label="Outstanding"
          value={formatPeso(summary.outstanding)}
          sub={`${summary.pendingCount} open`}
          tone="amber"
          icon={Clock}
        />
        <SummaryTile
          label="To Confirm"
          value={formatPeso(summary.awaiting)}
          sub={`${summary.awaitingCount} submitted`}
          tone="blue"
          icon={ArrowUpRight}
        />
        <SummaryTile
          label="Paid"
          value={formatPeso(summary.collected)}
          sub={`${summary.paidCount} receipts`}
          tone="emerald"
          icon={CheckCircle2}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
        <button
          type="button"
          onClick={() => setTab('dues')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
            tab === 'dues' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          Dues & Requests
          {openCount > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${tab === 'dues' ? 'bg-amber-500 text-slate-950' : 'bg-slate-300 text-slate-700'}`}>
              {openCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
            tab === 'history' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <ReceiptText className="w-3.5 h-3.5" />
          Receipts
          {history.length > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${tab === 'history' ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'}`}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {tab === 'dues' ? (
        <div className="space-y-2.5">
          {duePayments.length === 0 && awaitingPayments.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700 mt-2">You're all caught up</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                No unpaid rent or fees. New bills from your landlord will appear here with a Pay button.
              </p>
            </div>
          ) : (
            <>
              {duePayments.map((payment) => (
                <PaymentDueRow
                  key={payment.id}
                  payment={payment}
                  onPay={() => setPayingPayment(payment)}
                />
              ))}
              {awaitingPayments.map((payment) => (
                <PaymentDueRow key={payment.id} payment={payment} />
              ))}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
              <ReceiptText className="w-7 h-7 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600 mt-2">No receipts yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
                Once your landlord verifies a payment, the official receipt is stored here — ready to view or print.
              </p>
            </div>
          ) : (
            history.map(({ receipt, payment }) => (
              <button
                key={receipt.id}
                type="button"
                onClick={() => setViewingReceipt({ receipt, payment })}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-xs truncate group-hover:text-blue-900">
                    {payment?.title || receipt.title || 'Rent payment'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Paid {formatPaymentDate(receipt.paymentDate)}
                    {payment?.method ? ` · ${payment.method}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    Ref: {receipt.refNumber}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-black text-slate-900 text-sm">{formatPeso(receipt.amount)}</span>
                  <p className="text-[9px] text-emerald-700 font-bold flex items-center justify-end gap-0.5">
                    <ShieldCheck className="w-3 h-3" />
                    View receipt
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {landlord?.name && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-100">
          <Building2 className="w-3 h-3" />
          Payments are handled with {landlord.name}
          {landlord.phone ? ` · ${landlord.phone}` : ''}
        </p>
      )}

      {payingPayment && (
        <PayNowModal
          payment={payingPayment}
          property={property}
          onClose={() => setPayingPayment(null)}
          onPaid={() => {
            handlePaid();
          }}
        />
      )}

      {viewingReceipt && (
        <ReceiptModal
          receipt={viewingReceipt.receipt}
          payment={viewingReceipt.payment}
          property={property}
          student={user}
          landlord={landlord}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, sub, tone, icon: Icon }) {
  const tones = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    blue: 'bg-blue-50 border-blue-200 text-blue-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900'
  };
  const iconTones = {
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    emerald: 'text-emerald-600'
  };

  return (
    <div className={`rounded-xl border p-2.5 ${tones[tone] || tones.amber}`}>
      <div className="flex items-center gap-1">
        <Icon className={`w-3 h-3 ${iconTones[tone] || iconTones.amber}`} />
        <p className="text-[9px] font-black uppercase tracking-wide opacity-80">{label}</p>
      </div>
      <p className="font-black text-sm mt-1 leading-none">{value}</p>
      <p className="text-[9px] opacity-70 mt-1">{sub}</p>
    </div>
  );
}

function PaymentDueRow({ payment, onPay }) {
  const meta = getPaymentStatus(payment.status);
  const overdue = isPaymentOverdue(payment);
  const category = getPaymentCategory(payment.category);
  const canPay = Boolean(onPay) && ['pending', 'rejected'].includes(payment.status);
  const amount = paymentAmount(payment);

  return (
    <div className={`p-3 rounded-xl border ${overdue ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.chipClass}`}>
              {payment.status === 'awaiting_verification' ? 'To Confirm' : meta.label}
            </span>
            {overdue && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-rose-200 bg-rose-100 text-rose-800">
                Overdue
              </span>
            )}
            <span className="text-[9px] font-bold text-slate-400">{category.label}</span>
          </div>

          <p className="font-bold text-slate-900 text-xs mt-1.5 break-words">{payment.title}</p>

          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 flex-wrap">
            {payment.periodLabel && <span>{payment.periodLabel}</span>}
            {payment.dueDate && (
              <span className={`flex items-center gap-1 ${overdue ? 'text-rose-700 font-bold' : ''}`}>
                <Calendar className="w-3 h-3" />
                Due {formatPaymentDate(payment.dueDate)}
              </span>
            )}
          </div>

          {payment.status === 'awaiting_verification' && (
            <div className="mt-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-[10px] text-blue-900 space-y-0.5">
              <p className="font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Submitted {formatPaymentDate(payment.paidAt)} via {payment.method || 'payment'}
              </p>
              {payment.referenceNumber && (
                <p className="font-mono text-[10px] truncate">Ref: {payment.referenceNumber}</p>
              )}
              <p className="text-blue-700">Waiting for your landlord to verify and issue the receipt.</p>
            </div>
          )}

          {payment.status === 'rejected' && payment.declineReason && (
            <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-[10px] text-rose-900">
              <p className="font-bold">Payment declined</p>
              <p className="mt-0.5">{payment.declineReason}</p>
            </div>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className="font-black text-slate-900 text-base leading-none">{formatPeso(amount)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 flex items-center gap-1 min-w-0">
          <CreditCard className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {payment.status === 'awaiting_verification'
              ? 'Awaiting landlord confirmation'
              : payment.status === 'rejected'
                ? 'Correct the reference and try again'
                : 'Pay via GCash, bank transfer, cash or escrow'}
          </span>
        </p>
        {canPay ? (
          <button
            type="button"
            onClick={onPay}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0b1a30] hover:bg-[#152a4d] active:scale-95 text-white text-[10px] font-black transition-all cursor-pointer shadow-xs"
          >
            <span>{payment.status === 'rejected' ? 'Re-submit' : 'Pay Now'}</span>
            <ChevronRight className="w-3 h-3 text-amber-400" />
          </button>
        ) : (
          <span className="shrink-0 text-[10px] font-bold text-blue-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            In review
          </span>
        )}
      </div>
    </div>
  );
}
