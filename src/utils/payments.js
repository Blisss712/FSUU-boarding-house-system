/**
 * src/utils/payments.js
 * Shared vocabulary for the landlord ↔ student rent ledger.
 *
 * Nothing here talks to Supabase — this is the presentation layer used by the
 * payment cards and modals so a status is spelled, coloured and summarised the
 * same way everywhere.
 */

export const PAYMENT_CATEGORIES = [
  { value: 'Rent', label: 'Monthly Rent', hint: 'Regular room rent for the billing period' },
  { value: 'Move-in', label: 'Move-in Advance & Deposit', hint: 'First-month advance plus security deposit' },
  { value: 'Advance', label: 'Advance Rent', hint: 'Advance payment for a future month' },
  { value: 'Deposit', label: 'Security Deposit', hint: 'Refundable damage deposit' },
  { value: 'Electricity', label: 'Electricity (Submeter)', hint: 'Submeter reading billed by kWh' },
  { value: 'Water', label: 'Water Bill', hint: 'Water utility share for the period' },
  { value: 'Repair', label: 'Repair / Damage Fee', hint: 'Repair or replacement charge' },
  { value: 'Other', label: 'Other Fee', hint: 'A custom charge agreed with the landlord' }
];

export const PAYMENT_METHODS = [
  { value: 'GCash', label: 'GCash', hint: 'Send to the landlord’s GCash number', requiresReference: true },
  { value: 'Bank Transfer', label: 'Bank Transfer', hint: 'Transfer to the landlord’s bank account', requiresReference: true },
  { value: 'Cash', label: 'Cash Handover', hint: 'Hand over cash in person, then log it here', requiresReference: false },
  { value: 'Balay Urios Escrow', label: 'Balay Urios Escrow', hint: 'Handover coordinated through the pad’s escrow desk', requiresReference: true }
];

export const PAYMENT_STATUSES = ['pending', 'awaiting_verification', 'paid', 'rejected', 'cancelled'];

const STATUS_META = {
  pending: {
    label: 'Payment Due',
    studentLabel: 'Payment Due',
    landlordLabel: 'Unpaid Invoice',
    description: 'Waiting for the student to send the payment.',
    chipClass: 'bg-amber-50 text-amber-900 border-amber-200',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-700'
  },
  awaiting_verification: {
    label: 'Awaiting Verification',
    studentLabel: 'Awaiting Landlord Confirmation',
    landlordLabel: 'Needs Your Confirmation',
    description: 'The student submitted a payment — confirm it to issue the receipt.',
    chipClass: 'bg-blue-50 text-blue-900 border-blue-200',
    dotClass: 'bg-blue-500',
    textClass: 'text-blue-700'
  },
  paid: {
    label: 'Paid',
    studentLabel: 'Paid · Receipt Issued',
    landlordLabel: 'Paid · Receipt Issued',
    description: 'Verified by the landlord. The official receipt is on file.',
    chipClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-700'
  },
  rejected: {
    label: 'Payment Declined',
    studentLabel: 'Payment Needs Re-submission',
    landlordLabel: 'Payment Declined',
    description: 'The submitted reference did not match. Re-submit or ask the landlord.',
    chipClass: 'bg-rose-50 text-rose-900 border-rose-200',
    dotClass: 'bg-rose-500',
    textClass: 'text-rose-700'
  },
  cancelled: {
    label: 'Cancelled',
    studentLabel: 'Cancelled by Landlord',
    landlordLabel: 'Cancelled',
    description: 'This invoice was withdrawn and is no longer collectible.',
    chipClass: 'bg-slate-100 text-slate-600 border-slate-300',
    dotClass: 'bg-slate-400',
    textClass: 'text-slate-500'
  }
};

export function getPaymentStatus(status) {
  return STATUS_META[status] || STATUS_META.pending;
}

export function getPaymentCategory(value) {
  return PAYMENT_CATEGORIES.find((category) => category.value === value) || PAYMENT_CATEGORIES[PAYMENT_CATEGORIES.length - 1];
}

export function getPaymentMethod(value) {
  return PAYMENT_METHODS.find((method) => method.value === value) || null;
}

export function formatPeso(amount) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return '₱0';
  return `₱${parsed.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Format a date without letting the browser shift a `YYYY-MM-DD` string into
 * the previous day (a classic UTC-vs-local bug on Philippine time).
 */
export function formatPaymentDate(value, fallback = '—') {
  if (!value) return fallback;

  const text = String(value).trim();
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(text);

  if (Number.isNaN(date.getTime())) return text;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function todayISO() {
  return new Date().toISOString().split('T')[0];
}

export function addDaysISO(days, from = new Date()) {
  const date = new Date(from);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().split('T')[0];
}

export function currentPeriodLabel(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function isPaymentOverdue(payment) {
  if (!payment || !['pending', 'rejected'].includes(payment.status) || !payment.dueDate) {
    return false;
  }
  return String(payment.dueDate).slice(0, 10) < todayISO();
}

export function paymentAmount(payment) {
  const amount = Number(payment?.amount);
  return Number.isFinite(amount) ? amount : 0;
}

export function isPaymentOpen(payment) {
  return Boolean(payment) && ['pending', 'rejected'].includes(payment.status);
}

export function sortPaymentsByDue(payments = []) {
  return [...payments].sort((a, b) => {
    const aDue = String(a.dueDate || '9999-12-31');
    const bDue = String(b.dueDate || '9999-12-31');
    return aDue.localeCompare(bDue) || String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });
}

export function getDuePayments(payments = []) {
  return sortPaymentsByDue(payments.filter(isPaymentOpen));
}

export function getAwaitingPayments(payments = []) {
  return sortPaymentsByDue(payments.filter((payment) => payment.status === 'awaiting_verification'));
}

/**
 * Totals for the summary strips. Only collectible/open invoices count as
 * outstanding; cancelled invoices never do.
 */
export function summarizePayments(payments = []) {
  return payments.reduce((summary, payment) => {
    const amount = paymentAmount(payment);

    if (payment.status === 'paid') {
      summary.collected += amount;
      summary.paidCount += 1;
    } else if (payment.status === 'awaiting_verification') {
      summary.awaiting += amount;
      summary.awaitingCount += 1;
    } else if (payment.status === 'pending' || payment.status === 'rejected') {
      summary.outstanding += amount;
      summary.pendingCount += 1;
      if (isPaymentOverdue(payment)) summary.overdueCount += 1;
    }

    return summary;
  }, {
    collected: 0,
    awaiting: 0,
    outstanding: 0,
    paidCount: 0,
    awaitingCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });
}

/**
 * Merge the `receipts` table with paid ledger entries so the student sees one
 * clean history. Only real receipt rows are shown — a paid row whose receipt is
 * missing must never invent a receipt number.
 */
export function buildReceiptHistory(payments = [], receipts = []) {
  const rows = new Map();

  receipts.forEach((receipt) => {
    if (!receipt?.id) return;
    rows.set(receipt.id, { receipt, payment: null });
  });

  payments.forEach((payment) => {
    if (payment.status !== 'paid' || !payment.receiptId) return;
    if (rows.has(payment.receiptId)) {
      rows.get(payment.receiptId).payment = payment;
    }
  });

  return Array.from(rows.values()).sort((a, b) => {
    const aDate = String(a.receipt?.paymentDate || a.payment?.paidAt || '');
    const bDate = String(b.receipt?.paymentDate || b.payment?.paidAt || '');
    return bDate.localeCompare(aDate);
  });
}

export function defaultTitleForCategory(category, periodLabel) {
  const label = getPaymentCategory(category).label;
  return periodLabel ? `${label} — ${periodLabel}` : label;
}

export function defaultAmountForCategory(category, monthlyRent = 0) {
  const rent = Number(monthlyRent) || 0;
  if (category === 'Move-in') return rent * 2;
  if (category === 'Rent' || category === 'Advance' || category === 'Deposit') return rent;
  return 0;
}
