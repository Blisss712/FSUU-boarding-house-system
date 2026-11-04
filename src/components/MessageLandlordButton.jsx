import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, Loader2, AlertCircle, X } from 'lucide-react';
import { api, landlordMatchesAccount } from '../services/api';
import { landlordIntroDraft } from '../utils/messaging';
import { useAuth } from '../context/AuthContext';

const SHAPE_CLASS = {
  solid: 'bg-[#0b1a30] text-white hover:bg-[#152a4d] shadow-xs border border-[#0b1a30]',
  outline: 'bg-white text-[#0b1a30] border border-slate-200 hover:border-[#0b1a30]/40 hover:bg-slate-50',
  soft: 'bg-slate-100 text-[#0b1a30] border border-slate-200 hover:bg-slate-200'
};

/**
 * MessageLandlordButton
 * Opens (or reuses) the direct chat with the landlord behind a board listing
 * and hands the conversation id to `onOpenChat`, which switches to Messages.
 *
 * The in-app messaging system already exists (supabase/add-messaging.sql), so
 * this is only the missing entry point from a listing: no new tables needed.
 *
 * Props:
 *   property    — listing row (preferred; carries `landlord` + `id`)
 *   propertyId  — pad id when only the id is known (e.g. a pending application)
 *   landlord    — landlord JSON when the caller has it without the property
 *   padName     — pad name used in the starter message
 *   label       — button text (default "Message")
 *   labelClassName — extra classes for the text (e.g. 'hidden sm:inline')
 *   variant     — 'solid' | 'outline' | 'soft' | 'icon' | 'iconSolid'
 *   size        — 'xs' | 'sm' | 'md'
 *   className   — extra classes (e.g. 'w-full' for a full-width CTA)
 *   onOpenChat(conversationId, { draft }) — navigate to the thread
 *   onOpenAuth(mode) — prompt sign-in for signed-out visitors
 */
export default function MessageLandlordButton({
  property = null,
  propertyId = null,
  landlord: landlordProp = null,
  padName = '',
  label = 'Message',
  labelClassName = '',
  variant = 'outline',
  size = 'sm',
  className = '',
  onOpenChat,
  onOpenAuth
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const landlord = landlordProp || property?.landlord || null;
  const padId = propertyId || property?.id || null;
  const resolvedPadName = padName || property?.name || '';

  // Nothing to message: the pad has no landlord record, no navigation handler,
  // or the signed-in landlord is looking at their own listing.
  const isOwnListing = Boolean(
    user && landlord && landlordMatchesAccount(landlord, { id: user.id, email: user.email })
  );
  const isUsable = Boolean(onOpenChat) && !isOwnListing && Boolean(landlord || padId);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!isUsable) return null;

  const handleClick = async (event) => {
    event?.stopPropagation?.();
    event?.preventDefault?.();
    if (busy) return;

    if (!user) {
      onOpenAuth?.('login');
      return;
    }

    setBusy(true);
    try {
      const listing = property?.landlord
        ? property
        : { landlord, propertyId: padId };

      const result = await api.openLandlordChat(listing);
      if (!result?.conversationId) {
        throw new Error('Could not open a conversation with this landlord.');
      }

      onOpenChat?.(result.conversationId, {
        draft: landlordIntroDraft(resolvedPadName)
      });
    } catch (err) {
      setToast(err?.message || 'Could not message this landlord.');
    } finally {
      setBusy(false);
    }
  };

  const isIcon = variant === 'icon' || variant === 'iconSolid';
  const iconSize = size === 'md' ? 'w-4 h-4' : size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  const shapeClass = isIcon
    ? `${size === 'xs' ? 'w-7 h-7 rounded-lg' : size === 'md' ? 'w-10 h-10 rounded-xl' : 'w-8 h-8 rounded-xl'} ${
      variant === 'iconSolid'
        ? 'bg-[#0b1a30] text-white hover:bg-[#152a4d] shadow-xs'
        : 'bg-white border border-slate-200 hover:border-[#0b1a30]/40 hover:bg-slate-50 text-[#0b1a30]'
    }`
    : `${size === 'md' ? 'px-4 py-2.5 text-xs rounded-xl' : size === 'xs' ? 'px-2 py-1 text-[10px] rounded-lg' : 'px-3 py-1.5 text-[11px] rounded-xl'} ${
      SHAPE_CLASS[variant] || SHAPE_CLASS.outline
    }`;

  const buttonLabel = busy ? (isIcon ? '' : 'Opening…') : label;
  const title = isIcon
    ? 'Message the landlord'
    : /landlord/i.test(label) ? label : `${label} the landlord`;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title={title}
        aria-label={`Message ${landlord?.name || 'the landlord'}`}
        className={`inline-flex items-center justify-center gap-1.5 font-bold transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait cursor-pointer shrink-0 ${shapeClass} ${className}`}
      >
        {busy
          ? <Loader2 className={`${iconSize} animate-spin`} />
          : <MessageSquare className={iconSize} />}
        {!isIcon && <span className={labelClassName}>{buttonLabel}</span>}
      </button>

      {toast && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 pointer-events-none">
          <div
            role="status"
            className="pointer-events-auto w-full max-w-sm flex items-start gap-2 rounded-2xl bg-[#0b1a30] text-white px-3.5 py-3 shadow-2xl border border-white/10"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="flex-1 text-[11.5px] font-medium leading-relaxed">{toast}</p>
            <button
              type="button"
              onClick={() => setToast('')}
              className="text-white/60 hover:text-white shrink-0 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
