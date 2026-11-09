import React from 'react';
import {
  X,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Building2,
  User,
  Calendar,
  CreditCard,
  FileText,
  Hash,
  GraduationCap
} from 'lucide-react';
import { formatPeso, formatPaymentDate } from '../utils/payments';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders an official Balay Urios payment receipt and prints it through a
 * hidden iframe so the app chrome never ends up on paper.
 */
export default function ReceiptModal({ receipt, payment, property, student, landlord, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!receipt) return null;

  const amount = Number(payment?.amount ?? receipt.amount) || 0;
  const refNumber = receipt.refNumber || '—';
  const receiptId = receipt.id || payment?.receiptId || '—';
  const title = payment?.title || receipt.title || 'Rent Payment';
  const category = receipt.type || payment?.category || 'Rent';
  const propertyName = payment?.propertyName || property?.name || 'Boarding House';
  const roomNumber = payment?.roomNumber || '';
  const payerName = student?.name || payment?.studentName || 'Student Boarder';
  const payerCourse = student?.course || '';
  const payerStudentId = student?.studentId || '';
  const landlordName = landlord?.name || property?.landlord?.name || 'Landlord';
  const method = payment?.method || receipt.method || 'GCash / Escrow';
  const paymentDate = payment?.paidAt
    ? formatPaymentDate(payment.paidAt)
    : formatPaymentDate(receipt.paymentDate);
  const periodLabel = payment?.periodLabel || '';
  const description = payment?.description || '';
  const verifiedAt = payment?.verifiedAt ? formatPaymentDate(payment.verifiedAt) : '';
  const area = property?.area || '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(refNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the number is visible on screen anyway.
    }
  };

  const handlePrint = () => {
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Balay Urios Receipt ${escapeHtml(refNumber)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    background: #fff;
  }
  .sheet {
    max-width: 640px;
    margin: 0 auto;
    border: 1px solid #cbd5e1;
    border-radius: 18px;
    overflow: hidden;
  }
  .head {
    background: #0b1a30;
    color: #fff;
    padding: 26px 28px;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: flex-start;
  }
  .brand { display: flex; gap: 12px; align-items: center; }
  .mark {
    width: 44px; height: 44px; border-radius: 12px;
    background: #f59e0b; color: #0b1a30;
    font-weight: 900; font-size: 18px;
    display: flex; align-items: center; justify-content: center;
  }
  .brand h1 { margin: 0; font-size: 20px; letter-spacing: .4px; }
  .brand p { margin: 3px 0 0; color: #bfdbfe; font-size: 11px; }
  .doc { text-align: right; }
  .doc strong { display: block; font-size: 13px; letter-spacing: 1.6px; color: #fcd34d; }
  .doc span { display: block; font-size: 10px; color: #bfdbfe; margin-top: 4px; }
  .body { padding: 26px 28px; }
  .amount {
    border: 1px solid #d1fae5;
    background: #f0fdf4;
    border-radius: 14px;
    padding: 16px 18px;
    text-align: center;
    margin-bottom: 20px;
  }
  .amount .label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.6px; color: #047857; font-weight: 700; }
  .amount .value { font-size: 34px; font-weight: 900; margin-top: 4px; color: #064e3b; }
  .amount .status { margin-top: 6px; font-size: 10px; font-weight: 700; color: #047857; }
  table.meta { width: 100%; border-collapse: collapse; }
  table.meta td { padding: 9px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12px; vertical-align: top; }
  table.meta td:first-child { color: #64748b; width: 38%; }
  table.meta td:last-child { text-align: right; font-weight: 700; color: #0f172a; }
  .note {
    margin-top: 18px; padding: 12px 14px; border-radius: 10px;
    background: #f8fafc; border: 1px solid #e2e8f0;
    font-size: 10.5px; line-height: 1.6; color: #475569;
  }
  .foot {
    margin-top: 22px; padding-top: 14px; border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; gap: 24px;
    font-size: 10px; color: #64748b;
  }
  .sign { text-align: center; min-width: 180px; }
  .sign .line { border-top: 1px solid #94a3b8; margin-top: 26px; padding-top: 5px; font-weight: 700; color: #334155; }
  .seal {
    margin-top: 16px; text-align: center; font-size: 9.5px;
    letter-spacing: 1.4px; text-transform: uppercase; color: #0b1a30; font-weight: 700;
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">
        <div class="mark">BU</div>
        <div>
          <h1>BALAY URIOS</h1>
          <p>FSUU Main Campus · Butuan City · Student Housing Hub</p>
        </div>
      </div>
      <div class="doc">
        <strong>OFFICIAL RECEIPT</strong>
        <span>${escapeHtml(refNumber)}</span>
        <span>Issued ${escapeHtml(verifiedAt || paymentDate)}</span>
      </div>
    </div>
    <div class="body">
      <div class="amount">
        <div class="label">Amount Received</div>
        <div class="value">${escapeHtml(formatPeso(amount))}</div>
        <div class="status">PAID · VERIFIED · RECEIPT ISSUED</div>
      </div>
      <table class="meta">
        <tr><td>Received from</td><td>${escapeHtml(payerName)}${payerStudentId ? ` · ${escapeHtml(payerStudentId)}` : ''}</td></tr>
        ${payerCourse ? `<tr><td>Course &amp; year</td><td>${escapeHtml(payerCourse)}</td></tr>` : ''}
        <tr><td>Boarding house</td><td>${escapeHtml(propertyName)}${roomNumber ? ` · ${escapeHtml(roomNumber)}` : ''}</td></tr>
        ${area ? `<tr><td>Location</td><td>${escapeHtml(area)}</td></tr>` : ''}
        <tr><td>Payment for</td><td>${escapeHtml(title)}</td></tr>
        ${periodLabel ? `<tr><td>Billing period</td><td>${escapeHtml(periodLabel)}</td></tr>` : ''}
        <tr><td>Category</td><td>${escapeHtml(category)}</td></tr>
        <tr><td>Payment method</td><td>${escapeHtml(method)}</td></tr>
        ${payment?.referenceNumber ? `<tr><td>Student reference no.</td><td>${escapeHtml(payment.referenceNumber)}</td></tr>` : ''}
        <tr><td>Payment date</td><td>${escapeHtml(paymentDate)}</td></tr>
        <tr><td>Verified by</td><td>${escapeHtml(landlordName)}</td></tr>
        <tr><td>Receipt no.</td><td>${escapeHtml(refNumber)}</td></tr>
        <tr><td>Ledger ID</td><td>${escapeHtml(receiptId)}</td></tr>
      </table>
      ${description ? `<div class="note">${escapeHtml(description)}</div>` : ''}
      <div class="note">
        This is a system-generated receipt from Balay Urios. The payment was verified by the
        landlord who owns the boarding house. Keep this receipt as proof of payment for your
        tenancy records. Amounts are in Philippine Pesos (PHP).
      </div>
      <div class="foot">
        <div>
          <strong>Balay Urios · FSUU Student Housing Hub</strong><br />
          Butuan City, Agusan del Norte<br />
          Receipt ${escapeHtml(refNumber)}
        </div>
        <div class="sign">
          <div class="line">${escapeHtml(landlordName)}</div>
          Landlord / Authorized Host
        </div>
      </div>
      <div class="seal">Verified Official Receipt · Balay Urios Escrow Records</div>
    </div>
  </div>
</body>
</html>`;

    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';

    document.body.appendChild(frame);

    const doc = frame.contentWindow?.document;
    if (!doc) {
      frame.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      try {
        frame.contentWindow.focus();
        frame.contentWindow.print();
      } finally {
        setTimeout(() => frame.remove(), 1500);
      }
    };

    frame.onload = triggerPrint;
    setTimeout(triggerPrint, 350);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 my-auto overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0b1a30] via-[#12284c] to-[#1a3a6b] text-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-sm shrink-0">
                BU
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Balay Urios</p>
                <h3 className="font-black text-lg leading-tight">Official Payment Receipt</h3>
                <p className="text-[10px] text-blue-200 mt-0.5">FSUU Main Campus · Butuan City</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Close receipt"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[70dvh] overflow-y-auto p-5 space-y-4">
          {/* Amount + verified stamp */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center relative overflow-hidden">
            <span className="absolute -right-6 -top-6 w-24 h-24 rounded-full border-[6px] border-emerald-200/50" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">Amount Received</p>
            <p className="font-black text-3xl text-emerald-950 mt-1">{formatPeso(amount)}</p>
            <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3 h-3" />
              Paid · Verified
            </span>
          </div>

          {/* Key details */}
          <div className="rounded-2xl border border-slate-200 divide-y divide-dashed divide-slate-200 overflow-hidden">
            <ReceiptRow icon={User} label="Received from" value={payerName} sub={payerCourse} />
            <ReceiptRow
              icon={Building2}
              label="Boarding house"
              value={propertyName}
              sub={[roomNumber, area].filter(Boolean).join(' · ')}
            />
            <ReceiptRow icon={FileText} label="Payment for" value={title} sub={periodLabel || category} />
            <ReceiptRow icon={CreditCard} label="Payment method" value={method} sub={payment?.referenceNumber || ''} />
            <ReceiptRow
              icon={Calendar}
              label="Payment date"
              value={paymentDate}
              sub={verifiedAt ? `Verified ${verifiedAt}` : ''}
            />
            <ReceiptRow icon={Hash} label="Receipt no." value={refNumber} />
          </div>

          {payerStudentId && (
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              Student ID <span className="font-bold text-slate-700">{payerStudentId}</span>
            </p>
          )}

          {description && (
            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
              {description}
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-900 leading-relaxed">
              This receipt is generated by Balay Urios after the landlord verified the payment.
              Keep it as proof for your tenancy and escrow records.
            </p>
          </div>

          <p className="text-[10px] text-slate-400 text-center">
            Ledger ID <span className="font-mono">{receiptId}</span>
          </p>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            title="Copy receipt number"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy No.'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-xs font-black transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print / Save PDF</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-white">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-xs">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{label}</p>
        <p className="font-bold text-slate-800 break-words">{value || '—'}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-0.5 break-words">{sub}</p>}
      </div>
    </div>
  );
}
