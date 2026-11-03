import React, { useEffect, useRef } from 'react';
import { Bell, MessageSquare, X, CheckCheck } from 'lucide-react';

/**
 * NotificationsPanel
 * Dropdown panel triggered by the bell icon in Header.
 * Shows recent unread messages. Clicking a notification opens that chat.
 *
 * Props:
 *   notifications: Array of { id, senderName, propertyName, text, time, propertyId, read }
 *   onClose: () => void
 *   onOpenChat: (propertyId) => void
 *   onMarkAllRead: () => void
 */
export default function NotificationsPanel({ notifications = [], onClose, onOpenChat, onMarkAllRead }) {
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-[#0b1a30] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-extrabold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[10px] font-bold text-blue-300 hover:text-white transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3 h-3" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-slate-400 space-y-2">
            <Bell className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-600">No notifications yet</p>
            <p className="text-[11px] text-slate-400">
              New messages from landlords and boarders will appear here.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                onOpenChat(n.propertyId);
                onClose();
              }}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-start gap-3 ${
                !n.read ? 'bg-blue-50/60' : 'bg-white'
              }`}
            >
              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                !n.read ? 'bg-blue-100 text-blue-900' : 'bg-slate-100 text-slate-500'
              }`}>
                {n.senderName ? n.senderName.substring(0, 2).toUpperCase() : <MessageSquare className="w-4 h-4" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-extrabold text-slate-900 truncate">
                    {n.senderName || 'Unknown'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{n.time}</span>
                </div>
                <p className="text-[11px] font-semibold text-blue-700 truncate">{n.propertyName}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.text}</p>
              </div>

              {/* Unread dot */}
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => { onOpenChat(notifications[0]?.propertyId); onClose(); }}
            className="w-full text-center text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
          >
            Open Messages →
          </button>
        </div>
      )}
    </div>
  );
}
