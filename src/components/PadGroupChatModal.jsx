import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Send, 
  Megaphone, 
  Users, 
  Building2, 
  ShieldCheck, 
  Zap, 
  Droplets, 
  DoorOpen, 
  Clock, 
  AlertCircle, 
  CheckCheck, 
  Sparkles,
  RefreshCw,
  Calendar,
  MessageSquare,
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const ANNOUNCEMENT_CATEGORIES = [
  { id: 'general', label: 'General Notice', icon: Megaphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'power', label: 'ANECO / Power', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { id: 'water', label: 'Water Tank Supply', icon: Droplets, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
  { id: 'curfew', label: 'Curfew & Gate', icon: Lock, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { id: 'rent', label: 'Rent / Submeter', icon: Calendar, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
];

const PRESET_ANNOUNCEMENTS = [
  { category: 'power', text: 'ANECO scheduled maintenance this Saturday 8:00 AM - 5:00 PM. Hallway solar lights will remain on.' },
  { category: 'water', text: 'Overhead 1,000L stainless water tank cleaning scheduled tomorrow 9:00 AM - 12:00 PM.' },
  { category: 'curfew', text: 'Reminder: Main gate locks at 10:00 PM. Please submit digital curfew passes in My Tenancy for hospital duty.' },
  { category: 'rent', text: 'Monthly submeter electricity readings are now posted in your room passes. Due date is Nov 05.' }
];

export default function PadGroupChatModal({ 
  isOpen, 
  property, 
  onClose,
  initialAnnouncementMode = false 
}) {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';
  const senderName = user?.name || (isLandlord ? 'Landlord Host' : 'Student Boarder');
  const userInitials = user?.avatarInitials || senderName.substring(0, 2).toUpperCase();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAnnouncementMode, setIsAnnouncementMode] = useState(initialAnnouncementMode);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [tenantsCount, setTenantsCount] = useState(0);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load group messages & announcements
  const loadMessages = useCallback(async () => {
    if (!property?.id) return;
    try {
      const data = await api.getPadGroupMessages(property.id);
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.warn('[PadGroupChatModal] Error loading group messages:', err);
    } finally {
      setLoading(false);
    }
  }, [property?.id]);

  useEffect(() => {
    if (isOpen && property?.id) {
      setLoading(true);
      loadMessages();

      // Count active tenants for this pad — real number only, never a placeholder.
      api.getTenantsByProperty(property.id).then(res => {
        setTenantsCount(Array.isArray(res?.data) ? res.data.length : 0);
      }).catch(() => setTenantsCount(0));

      // 1. Supabase Real-time channel for group chats
      const channel = supabase
        .channel(`pad_group_${property.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `propertyId=eq.${property.id}`
        }, (payload) => {
          const newMsg = payload.new;
          const parsed = api._parseSender(newMsg.sender, property.landlord?.name);
          if (parsed.threadUserId === 'group' || newMsg.text?.includes('[ANNOUNCEMENT]')) {
            const enriched = {
              ...newMsg,
              parsedSender: parsed,
              senderRole: parsed.role,
              senderName: parsed.name,
              threadUserId: 'group',
              isAnnouncement: Boolean(parsed.isAnnouncement || newMsg.text?.startsWith('📢')),
              announcementCategory: parsed.announcementCategory || 'general'
            };
            setMessages(prev => {
              if (prev.some(m => m.id === enriched.id)) return prev;
              return [...prev, enriched];
            });
          }
        })
        .subscribe();

      // 2. Polling interval fallback
      const interval = setInterval(loadMessages, 4000);

      return () => {
        supabase.removeChannel(channel);
        clearInterval(interval);
      };
    }
  }, [isOpen, property?.id, loadMessages]);

  if (!isOpen || !property) return null;

  // Handle sending a message or announcement
  const handleSend = async (customText, overrideAnnouncement = null, overrideCategory = null) => {
    const rawText = (customText || inputText).trim();
    if (!rawText || isSending || !property?.id) return;

    const asAnnouncement = overrideAnnouncement !== null ? overrideAnnouncement : (isLandlord && isAnnouncementMode);
    const category = overrideCategory || selectedCategory;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tempId = `temp-${Date.now()}`;

    const displayText = asAnnouncement 
      ? `📢 [${category.toUpperCase()}] ${rawText}`
      : rawText;

    const optimisticMsg = {
      id: tempId,
      propertyId: property.id,
      sender: user?.role || 'boarder',
      senderRole: user?.role || 'boarder',
      senderName,
      text: displayText,
      time,
      isAnnouncement: asAnnouncement,
      announcementCategory: category,
      parsedSender: {
        role: user?.role || 'boarder',
        name: senderName,
        userId: user?.id || null,
        threadUserId: 'group',
        avatarInitials: userInitials,
        isAnnouncement: asAnnouncement,
        announcementCategory: category
      },
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await api.sendPadGroupMessage(property.id, rawText, {
        user,
        isAnnouncement: asAnnouncement,
        announcementCategory: category
      });

      if (res?.data?.sentMessage) {
        setMessages(prev => 
          prev.map(m => m.id === tempId ? res.data.sentMessage : m)
        );
      }
    } catch (err) {
      console.error('[PadGroupChatModal] Error sending group message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Find latest announcement to pin at top
  const latestAnnouncement = [...messages].reverse().find(m => m.isAnnouncement || m.text?.startsWith('📢'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[92vh] sm:h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#0b1a30] via-[#12284c] to-[#1c3f76] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 text-[#0b1a30] flex items-center justify-center font-black shadow-md">
                <Users className="w-6 h-6 text-[#0b1a30]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0b1a30]" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white">{property.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Megaphone className="w-2.5 h-2.5" />
                  <span>Pad Group</span>
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <span className="font-semibold text-white">{tenantsCount} Active {tenantsCount === 1 ? 'Boarder' : 'Boarders'}</span>
                <span>•</span>
                <span>Landlord Announcements & Community Chat</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pinned Latest Announcement Banner */}
        {latestAnnouncement && (
          <div className="px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/90 flex items-start gap-2.5 shrink-0 text-xs text-amber-950">
            <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 font-bold shadow-2xs">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-amber-900 bg-amber-200/70 px-1.5 py-0.2 rounded">
                  Pinned Host Announcement
                </span>
                <span className="text-[10px] text-amber-800">{latestAnnouncement.time}</span>
              </div>
              <p className="font-bold text-amber-950 mt-0.5 line-clamp-2">
                {latestAnnouncement.text.replace(/^📢\s*(\[[^\]]+\])?\s*/i, '')}
              </p>
            </div>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 bg-slate-50/70">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-blue-900 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-500">Connecting to Pad Community Group...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center max-w-sm mx-auto space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
                📢
              </div>
              <h4 className="font-extrabold text-sm text-slate-800">Pad Group Chat Active</h4>
              <p className="text-xs text-slate-500">
                This is the official group channel for <strong>{property.name}</strong>. All residents receive notifications when announcements are posted.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = (user?.id && m.parsedSender?.userId === user.id) ||
                           (isLandlord && m.senderRole === 'landlord');
              const isAnnouncement = m.isAnnouncement || m.text?.startsWith('📢');
              const cleanText = m.text?.replace(/^📢\s*(\[[^\]]+\])?\s*/i, '') || m.text;

              if (isAnnouncement) {
                return (
                  <div key={m.id} className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 shadow-xs space-y-1.5 my-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Megaphone className="w-3 h-3" />
                          <span>Official Announcement</span>
                        </span>
                        <span className="font-bold text-xs text-amber-950">
                          {m.senderName || 'Landlord Host'}
                        </span>
                      </div>
                      <span className="text-[10px] text-amber-800 font-medium">{m.time}</span>
                    </div>

                    <p className="text-xs sm:text-sm font-extrabold text-slate-900 leading-relaxed whitespace-pre-wrap">
                      {cleanText}
                    </p>

                    <div className="pt-1 flex items-center gap-1.5 text-[10px] text-amber-800 font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Broadcasted to all {tenantsCount} active room {tenantsCount === 1 ? 'tenant' : 'tenants'}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={m.id} 
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                    m.senderRole === 'landlord'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-[#0b1a30] text-white'
                  }`}>
                    {m.parsedSender?.avatarInitials || (m.senderName ? m.senderName.substring(0, 2).toUpperCase() : 'BD')}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-1.5 text-[10px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-extrabold text-slate-700">{m.senderName}</span>
                      {m.senderRole === 'landlord' && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold text-[9px]">
                          Landlady Host
                        </span>
                      )}
                      <span className="text-slate-400">{m.time}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                      isMe 
                        ? 'bg-[#0b1a30] text-white rounded-tr-xs' 
                        : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Landlord Announcement Composer Controls (Landlords Only) */}
        {isLandlord && (
          <div className="p-2.5 bg-amber-50/80 border-t border-amber-200 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-950 select-none">
                <input
                  type="checkbox"
                  checked={isAnnouncementMode}
                  onChange={(e) => setIsAnnouncementMode(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <Megaphone className="w-3.5 h-3.5 text-amber-700" />
                <span>Broadcast as Official Pad Announcement</span>
              </label>

              {isAnnouncementMode && (
                <div className="flex items-center gap-1 flex-wrap">
                  {ANNOUNCEMENT_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        selectedCategory === cat.id 
                          ? 'bg-amber-600 text-white border-amber-700 shadow-2xs' 
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Preset Announcement Chips */}
            {isAnnouncementMode && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-[10.5px]">
                {PRESET_ANNOUNCEMENTS.map((pr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSend(pr.text, true, pr.category)}
                    className="px-2.5 py-1 rounded-xl bg-white border border-amber-200 hover:bg-amber-100/70 text-amber-950 whitespace-nowrap transition-colors cursor-pointer shrink-0"
                  >
                    + {pr.text.substring(0, 38)}...
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }} 
          className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isLandlord && isAnnouncementMode
                ? "Type announcement for all tenants (e.g. ANECO power maintenance Saturday)..."
                : `Message ${property.name} Community Group...`
            }
            className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-40 shrink-0 ${
              isLandlord && isAnnouncementMode
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-[#0b1a30] hover:bg-[#1a3a6b] text-white'
            }`}
          >
            {isSending ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {isLandlord && isAnnouncementMode ? 'Broadcast' : 'Send'}
            </span>
          </button>
        </form>

      </div>
    </div>
  );
}
