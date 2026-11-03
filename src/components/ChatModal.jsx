import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Send, 
  Loader2, 
  MessageSquare, 
  CheckCheck, 
  ArrowLeft,
  Users,
  Megaphone,
  Pin,
  Search,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

function getOrCreateGuestId() {
  if (typeof window === 'undefined') return 'guest';
  try {
    let gid = localStorage.getItem('balay_guest_chat_id');
    if (!gid) {
      gid = `guest-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem('balay_guest_chat_id', gid);
    }
    return gid;
  } catch {
    return 'guest';
  }
}

const ANNOUNCEMENT_CATEGORIES = [
  { id: 'general', label: 'General Notice' },
  { id: 'power', label: 'ANECO / Power' },
  { id: 'water', label: 'Water Tank Supply' },
  { id: 'curfew', label: 'Curfew & Gate' },
  { id: 'rent', label: 'Rent / Submeter' },
];

/**
 * ChatModal
 * Real-time, human-to-human chat system with chat heads for both Landlords and Students:
 * - Pad Group Chats: Strictly exclusive to the landlord and students actively boarding in the pad.
 *   Tied only to the boarding house you are boarded in.
 *   No dropdown switcher, no public join option, and no leave group option — you belong to the
 *   group as long as you are boarded in the pad.
 * - Direct Landlord Chats: 1-on-1 direct inquiries with verified pad hosts via sidebar chat heads.
 * - Inquiring Students list (for landlords).
 */
export default function ChatModal({ property, allProperties = [], onClose }) {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';

  // Persist guest ID in localStorage for boarders who aren't logged in
  const [guestId, setGuestId] = useState(getOrCreateGuestId);

  const activeUserId = user?.id || guestId;
  const activeUserName = user?.name || (isLandlord ? 'Landlord Host' : 'Student Boarder');

  // Currently active property being viewed in chat
  const [activeProperty, setActiveProperty] = useState(() => {
    if (property && property.id && property.id !== 'all') {
      return property;
    }
    return null;
  });

  // Selected thread: 'group' for Pad Group Chat, or user ID for 1-on-1 direct chats
  const [selectedThreadUserId, setSelectedThreadUserId] = useState(() => {
    if (property?.isGroupChat || property?.threadUserId === 'group') return 'group';
    if (property?.targetStudent?.id) return property.targetStudent.id;
    if (property?.threadUserId) return property.threadUserId;
    if (property && property.id && property.id !== 'all') {
      return isLandlord ? null : activeUserId;
    }
    return null;
  });

  // Conversations list (Chat Heads drawer)
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'groups' | 'direct'

  // Messages stream for the active conversation
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Landlord announcement mode for Pad Group Chat
  const [isAnnouncementMode, setIsAnnouncementMode] = useState(false);
  const [announcementCategory, setAnnouncementCategory] = useState('general');

  // Mobile drawer state: show chat heads list or active conversation
  const [mobileShowThreads, setMobileShowThreads] = useState(() => {
    if (property && property.id && property.id !== 'all') return false;
    return true;
  });

  const messagesEndRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync state whenever the authenticated user switches or logs out
  const prevUserIdRef = useRef(user?.id);
  useEffect(() => {
    if (prevUserIdRef.current !== user?.id) {
      prevUserIdRef.current = user?.id;
      if (!user?.id) {
        setGuestId(getOrCreateGuestId());
      }
      setActiveProperty(property && property.id && property.id !== 'all' ? property : null);
      setSelectedThreadUserId(null);
    }
  }, [user?.id, property]);

  // Keep activeProperty synced when property prop explicitly changes
  const prevPropIdRef = useRef(property?.id);
  useEffect(() => {
    if (property && property.id && property.id !== 'all' && property.id !== prevPropIdRef.current) {
      prevPropIdRef.current = property.id;
      setActiveProperty(property);
      if (property?.isGroupChat || property?.threadUserId === 'group') {
        setSelectedThreadUserId('group');
      } else if (property?.targetStudent?.id) {
        setSelectedThreadUserId(property.targetStudent.id);
      } else if (!isLandlord) {
        setSelectedThreadUserId(activeUserId);
      }
      setMobileShowThreads(false);
    }
  }, [property, isLandlord, activeUserId]);

  // Load conversations list (Chat Heads) for both Landlords and Students
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const convs = await api.getConversations(user, allProperties, guestId);
      setConversations(convs);

      // If activeProperty is not set yet or invalid, pick the best default
      setActiveProperty(prevProp => {
        if (property && property.id && property.id !== 'all') {
          return property;
        }
        if (prevProp?.id && convs.some(c => c.propertyId === prevProp.id)) {
          return prevProp;
        }
        if (convs.length > 0) {
          // If boarder has a pad group, default to it, else first direct conversation
          const padGroup = convs.find(c => c.isGroupChat || c.threadUserId === 'group');
          const defaultConv = padGroup || convs[0];
          setSelectedThreadUserId(defaultConv.threadUserId);
          return allProperties.find(p => p.id === defaultConv.propertyId) || { id: defaultConv.propertyId, name: defaultConv.propertyName };
        }
        return null;
      });
    } catch (err) {
      console.warn('[ChatModal] Error loading conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [user, allProperties, guestId, property]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Fetch messages for active property + selected thread
  const loadMessages = useCallback(async () => {
    if (!activeProperty?.id) return;
    setLoadingMessages(true);

    try {
      const threadToFetch = selectedThreadUserId === 'group'
        ? 'group'
        : (isLandlord ? selectedThreadUserId : activeUserId);
      const history = await api.getChatHistory(activeProperty.id, threadToFetch);
      setMessages(history);
    } catch (err) {
      console.warn('[ChatModal] Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeProperty?.id, isLandlord, selectedThreadUserId, activeUserId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Real-time Supabase subscription + fallback polling
  useEffect(() => {
    if (!activeProperty?.id) return;

    // 1. Supabase Realtime channel subscription
    const channel = supabase
      .channel(`chats-room-${activeProperty.id}-${selectedThreadUserId || 'all'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chats',
        filter: `propertyId=eq.${activeProperty.id}`
      }, (payload) => {
        const newMsg = payload.new;
        if (!newMsg) return;

        const landlordName = activeProperty?.landlord?.name || 'Landlord';
        const parsed = api._parseSender(newMsg.sender, landlordName);
        const isAnnouncement = Boolean(
          parsed.isAnnouncement || 
          newMsg.isAnnouncement || 
          (newMsg.text && newMsg.text.startsWith('📢'))
        );

        const enriched = {
          ...newMsg,
          parsedSender: parsed,
          senderRole: parsed.role,
          senderName: parsed.name,
          threadUserId: parsed.threadUserId,
          isAnnouncement,
          announcementCategory: parsed.announcementCategory || 'general'
        };

        // Determine if message belongs to current thread
        const isGroup = selectedThreadUserId === 'group';
        let matchesThread = false;

        if (isGroup) {
          matchesThread = (enriched.threadUserId === 'group' || enriched.isAnnouncement || enriched.text?.startsWith('📢')) &&
                          !enriched.id.startsWith('chat-init-') && enriched.id !== 'chat-001';
        } else {
          const currentThreadId = isLandlord ? selectedThreadUserId : activeUserId;
          matchesThread = (!currentThreadId || enriched.threadUserId === currentThreadId || enriched.id.startsWith('chat-init-') || enriched.id === 'chat-001') &&
                          enriched.threadUserId !== 'group' &&
                          !enriched.isAnnouncement &&
                          !enriched.text?.startsWith('📢');
        }

        if (matchesThread) {
          setMessages(prev => {
            if (prev.some(m => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
        }

        // Also update conversations list
        loadConversations();
      })
      .subscribe();

    // 2. Fallback polling every 4 seconds
    const interval = setInterval(() => {
      if (!isSending) {
        const threadToFetch = selectedThreadUserId === 'group'
          ? 'group'
          : (isLandlord ? selectedThreadUserId : activeUserId);
        api.getChatHistory(activeProperty.id, threadToFetch).then(fresh => {
          if (Array.isArray(fresh) && fresh.length > 0) {
            setMessages(fresh);
          }
        }).catch(() => {});
      }
    }, 4000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [activeProperty?.id, activeProperty?.landlord?.name, selectedThreadUserId, isLandlord, activeUserId, isSending, loadConversations]);

  // Send message
  const handleSendMessage = useCallback(async (customText) => {
    const text = (customText || inputText).trim();
    if (!text || isSending || !activeProperty?.id) return;

    const isGroup = selectedThreadUserId === 'group';
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const senderRole = isLandlord ? 'landlord' : 'boarder';
    const currentThreadUserId = isGroup 
      ? 'group'
      : (isLandlord ? (selectedThreadUserId || 'guest') : activeUserId);

    const isAnnouncement = Boolean(isGroup && isLandlord && (isAnnouncementMode || text.startsWith('📢')));
    const formattedText = isAnnouncement && !text.startsWith('📢')
      ? `📢 [${announcementCategory.toUpperCase()}] ${text}`
      : text;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      propertyId: activeProperty.id,
      sender: senderRole,
      senderRole,
      senderName: activeUserName,
      threadUserId: currentThreadUserId,
      isAnnouncement,
      announcementCategory: isAnnouncement ? announcementCategory : null,
      parsedSender: {
        role: senderRole,
        name: activeUserName,
        userId: user?.id || null,
        threadUserId: currentThreadUserId,
        avatarInitials: user?.avatarInitials || activeUserName.substring(0, 2).toUpperCase(),
        isAnnouncement,
        announcementCategory: isAnnouncement ? announcementCategory : null
      },
      time,
      text: formattedText
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInputText('');
    setIsSending(true);

    try {
      let res;
      if (isGroup) {
        res = await api.sendPadGroupMessage(activeProperty.id, formattedText, {
          user,
          isAnnouncement,
          announcementCategory
        });
      } else {
        res = await api.sendMessage(
          activeProperty.id,
          formattedText,
          {
            role: senderRole,
            name: activeUserName,
            id: user?.id || null,
            avatarInitials: user?.avatarInitials || activeUserName.substring(0, 2).toUpperCase(),
            threadUserId: currentThreadUserId
          },
          { threadUserId: currentThreadUserId }
        );
      }

      if (res?.data?.sentMessage) {
        setMessages(prev => 
          prev.map(m => m.id === tempId ? res.data.sentMessage : m)
        );
      }
      loadConversations();
    } catch (err) {
      console.error('[ChatModal] Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, activeProperty?.id, isLandlord, selectedThreadUserId, activeUserId, activeUserName, user, isAnnouncementMode, announcementCategory, loadConversations]);

  // Filter conversations based on search and tab
  const filteredConversations = conversations.filter(c => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title?.toLowerCase().includes(q);
      const matchProp = c.propertyName?.toLowerCase().includes(q);
      const matchMsg = c.lastMessage?.toLowerCase().includes(q);
      const matchName = (c.boarderName || c.landlordName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchProp && !matchMsg && !matchName) return false;
    }

    // Tab filter
    if (filterTab === 'groups') {
      return c.isGroupChat || c.type === 'group' || c.threadUserId === 'group';
    }
    if (filterTab === 'direct') {
      return !c.isGroupChat && c.type !== 'group' && c.threadUserId !== 'group';
    }
    return true;
  });

  const padGroupCount = conversations.filter(c => c.isGroupChat || c.type === 'group' || c.threadUserId === 'group').length;
  const directCount = conversations.filter(c => !c.isGroupChat && c.type !== 'group' && c.threadUserId !== 'group').length;

  // Active conversation metadata
  const activeConversation = conversations.find(c => 
    c.propertyId === activeProperty?.id && (
      selectedThreadUserId === 'group' 
        ? (c.isGroupChat || c.threadUserId === 'group') 
        : (c.threadUserId === selectedThreadUserId || (!c.isGroupChat && !isLandlord))
    )
  );

  const isGroupChatActive = selectedThreadUserId === 'group' || activeConversation?.isGroupChat;

  const currentLandlord = activeProperty?.landlord || {
    name: activeConversation?.landlordName || 'Boarding Pad Host',
    initials: activeConversation?.avatarInitials || 'BH',
    phone: ''
  };

  // Latest announcement for pinned banner in group chat
  const latestAnnouncement = isGroupChatActive 
    ? [...messages].reverse().find(m => m.isAnnouncement || m.text?.startsWith('📢') || m.parsedSender?.isAnnouncement)
    : null;

  // Quick inquiry chips
  const directStarterChips = [
    'Available pa ba ang room for next semester?',
    'Allowed ba ang induction / appliances sa room?',
    'May curfew pass ba para sa hospital clinical duty?',
    'Pwede bang mag-ocular visit bukas ng umaga?'
  ];

  const groupStarterChips = [
    'May tubig ba ngayon sa 2nd floor?',
    'Available ba ang common study area / kitchen?',
    'Saan po designated parking area ng motor?',
    'Anong oras po gate curfew tonight?'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-100 my-auto flex flex-col h-[650px] max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-4 py-3 bg-[#0b1a30] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            {/* Mobile back button: switch back to chat heads drawer */}
            {!mobileShowThreads && (
              <button
                type="button"
                onClick={() => setMobileShowThreads(true)}
                className="sm:hidden p-1.5 rounded-lg hover:bg-white/10 text-white mr-1 cursor-pointer"
                title="View all chats & pad groups"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}

            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-black text-xs text-amber-400 shrink-0">
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm text-white tracking-tight">
                  {isLandlord ? 'Balay Urios Host Portal · Live Chats' : 'Balay Urios · Chats & Pad Groups'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Direct
                </span>
              </div>
              <p className="text-[11px] text-blue-200">
                {isLandlord 
                  ? `Host: ${activeUserName} · Managing Pad Inquiries & Community`
                  : `Connected as ${activeUserName} · Pad group exclusive to boarded residents`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Body: Split View with Chat Heads Sidebar (for both Landlord and Student) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Chat Heads Sidebar */}
          <div className={`${mobileShowThreads ? 'flex' : 'hidden sm:flex'} w-full sm:w-80 md:w-84 border-r border-slate-200 bg-slate-50 flex-col shrink-0 overflow-hidden`}>
            
            {/* Sidebar Header & Search */}
            <div className="p-3 bg-white border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-black text-slate-900 tracking-tight">
                    {isLandlord ? 'Host Chats & Groups' : 'My Chats & Pad Groups'}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                    {conversations.length}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">
                  Real-time
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isLandlord ? "Search inquiries or pad..." : "Search chats, landlords, pads..."}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-[#0b1a30] focus:bg-white transition-all font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterTab === 'all'
                      ? 'bg-[#0b1a30] text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  All ({conversations.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('groups')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    filterTab === 'groups'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/60'
                  }`}
                >
                  <span>👥 Pad Groups</span>
                  <span className="text-[9px] opacity-80">({padGroupCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('direct')}
                  className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                    filterTab === 'direct'
                      ? 'bg-blue-800 text-white shadow-2xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/60'
                  }`}
                >
                  <span>{isLandlord ? '👤 Inquiries' : '💬 Landlords'}</span>
                  <span className="text-[9px] opacity-80">({directCount})</span>
                </button>
              </div>
            </div>

            {/* Chat Heads Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {loadingConversations ? (
                <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                  <span>Loading conversations...</span>
                </div>
              ) : filterTab === 'groups' && filteredConversations.length === 0 ? (
                /* Dedicated Notice: Pad group is strictly exclusive to boarded tenants */
                <div className="p-6 text-center space-y-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800">No Active Pad Group</h4>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                      Pad group chats are exclusive only to the landlord and students actively boarding in the pad. When you board a pad, its group chat will appear here.
                    </p>
                  </div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center text-slate-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-600">No chats found</p>
                  <p className="text-[11px] text-slate-400">
                    {searchQuery ? 'Try clearing your search query.' : 'Conversations with landlords and your active pad group appear here.'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((c) => {
                  const isGroup = c.isGroupChat || c.type === 'group' || c.threadUserId === 'group';
                  const isSelected = activeProperty?.id === c.propertyId && (
                    isGroup ? selectedThreadUserId === 'group' : (isLandlord ? selectedThreadUserId === c.threadUserId : selectedThreadUserId !== 'group')
                  );

                  return (
                    <button
                      key={c.threadKey}
                      type="button"
                      onClick={() => {
                        const newThread = isGroup ? 'group' : (isLandlord ? c.threadUserId : activeUserId);
                        setSelectedThreadUserId(newThread);
                        const prop = allProperties.find(p => p.id === c.propertyId);
                        if (prop) {
                          setActiveProperty(prop);
                        } else {
                          setActiveProperty({ id: c.propertyId, name: c.propertyName });
                        }
                        setMobileShowThreads(false);
                      }}
                      className={`w-full text-left p-3 transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected 
                          ? (isGroup ? 'bg-emerald-50/90 border-l-4 border-emerald-600 shadow-2xs' : 'bg-blue-50/90 border-l-4 border-[#0b1a30] shadow-2xs')
                          : 'hover:bg-slate-100/90 bg-white border-l-4 border-transparent'
                      }`}
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        {isGroup ? (
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-black text-sm flex items-center justify-center shadow-xs">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0b1a30] to-blue-900 text-amber-400 font-black text-xs flex items-center justify-center shadow-xs border border-blue-400/20">
                            {c.avatarInitials || (c.title ? c.title.substring(0, 2).toUpperCase() : 'BU')}
                          </div>
                        )}
                        {isGroup ? (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          </span>
                        ) : (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className={`text-xs font-black truncate ${isSelected ? 'text-slate-900' : 'text-slate-800'}`}>
                            {c.title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {c.lastTime}
                          </span>
                        </div>

                        {/* Badges / Property name */}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isGroup ? (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              👥 Pad Group
                            </span>
                          ) : (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-900 border border-blue-200 shrink-0">
                              {isLandlord ? '👤 Inquiry' : '💬 Host Direct'}
                            </span>
                          )}
                          <span className="text-[10.5px] font-semibold text-slate-500 truncate">
                            {c.propertyName}
                          </span>
                        </div>

                        {/* Last message preview */}
                        <p className={`text-[11px] truncate mt-1 ${
                          c.lastMessage?.startsWith('📢') ? 'text-amber-800 font-semibold' : 'text-slate-500'
                        }`}>
                          {c.lastMessage}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Conversation Pane */}
          <div className={`${mobileShowThreads ? 'hidden sm:flex' : 'flex'} flex-1 flex-col bg-white overflow-hidden`}>
            
            {/* Conversation Subheader (NO dropdown pads switcher) */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Mobile back button to show chat heads drawer */}
                <button
                  type="button"
                  onClick={() => setMobileShowThreads(true)}
                  className="sm:hidden p-1.5 -ml-1 rounded-xl hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  title="Back to all chats"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                {/* Avatar */}
                {isGroupChatActive ? (
                  <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-br from-[#0b1a30] to-blue-900 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 shadow-2xs border border-blue-400/20">
                    {isLandlord 
                      ? (activeConversation?.avatarInitials || (activeConversation?.title ? activeConversation.title.substring(0, 2).toUpperCase() : 'ST'))
                      : currentLandlord.initials}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-black text-slate-900 leading-tight truncate">
                      {isGroupChatActive 
                        ? `${activeProperty?.name || 'Boarding Pad'} (Pad Group)`
                        : (isLandlord 
                            ? (activeConversation?.boarderName || activeConversation?.title || 'Inquiring Student')
                            : (activeConversation?.landlordName || currentLandlord.name))}
                    </h4>
                    {isGroupChatActive ? (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Resident Pad Group
                      </span>
                    ) : (
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                        {isLandlord ? 'Direct Inquiry' : 'Host Direct'}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-slate-500 font-medium truncate">
                    {activeProperty?.name} · {isGroupChatActive ? 'Official Landlord Announcements & Boarder Chat' : (isLandlord ? 'Direct Student Inquiry' : 'Host replies directly')}
                  </p>
                </div>
              </div>

              {/* Status pill on the right (Clean minimal replacement for old pads dropdown) */}
              <div className="shrink-0 ml-2">
                {isGroupChatActive ? (
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                    Pad Group
                  </span>
                ) : isLandlord ? (
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                    Direct Inquiry
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-100 text-blue-900 border border-blue-200 shadow-2xs">
                    Host Direct
                  </span>
                )}
              </div>
            </div>

            {/* Pinned Pad Announcement Bar if in Group Chat */}
            {isGroupChatActive && latestAnnouncement && (
              <div className="mx-3 sm:mx-4 mt-2.5 p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-2 shadow-2xs shrink-0">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                      <Pin className="w-3 h-3 text-amber-700" /> Pinned Landlord Announcement
                    </span>
                    <span className="text-[9.5px] text-amber-700 font-mono">
                      {latestAnnouncement.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-950 font-medium mt-0.5 line-clamp-2">
                    {latestAnnouncement.text}
                  </p>
                </div>
              </div>
            )}

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                  <span>Loading live conversation...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2 p-6 text-center">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">No messages yet</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    {isGroupChatActive 
                      ? "Start the conversation in this pad's group chat! Landlord announcements and fellow boarders appear here."
                      : (isLandlord 
                          ? "Select an inquiry or wait for a student to reach out."
                          : `Send a question to ${currentLandlord.name}. They will receive it and reply directly!`)}
                  </p>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const role = m.senderRole || m.parsedSender?.role || (m.sender === 'landlord' ? 'landlord' : 'boarder');
                  const isMe = user?.id 
                    ? (m.parsedSender?.userId === user.id || (isLandlord && role === 'landlord'))
                    : (isLandlord ? role === 'landlord' : (role === 'boarder' && m.threadUserId === activeUserId));
                  const senderDisplayName = m.senderName || m.parsedSender?.name || (role === 'landlord' ? currentLandlord.name : 'Student Boarder');
                  const isAnnouncement = Boolean(m.isAnnouncement || m.parsedSender?.isAnnouncement || m.text?.startsWith('📢'));

                  // Render Landlord Announcement Card in Group Chat
                  if (isAnnouncement) {
                    return (
                      <div key={m.id || idx} className="my-2 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-2xs">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">📢</span>
                            <span className="text-[10.5px] font-black text-amber-900 uppercase tracking-wider">
                              Official Announcement · {m.senderName || currentLandlord.name}
                            </span>
                            <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">
                              Landlord
                            </span>
                          </div>
                          <span className="text-[9.5px] text-amber-700 font-mono">{m.time}</span>
                        </div>
                        <p className="text-xs font-semibold text-amber-950 leading-relaxed whitespace-pre-wrap">
                          {m.text}
                        </p>
                      </div>
                    );
                  }

                  // Regular Message Bubbles
                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label */}
                      <span className="text-[10px] font-bold text-slate-500 mb-0.5 px-1 flex items-center gap-1">
                        {isMe ? 'You' : senderDisplayName}
                        {role === 'landlord' && (
                          <span className="text-[9px] bg-blue-100 text-blue-900 px-1 py-0.2 rounded font-semibold">
                            Host
                          </span>
                        )}
                        {isGroupChatActive && role === 'boarder' && !isMe && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold">
                            Boarder
                          </span>
                        )}
                      </span>

                      {/* Message Bubble */}
                      <div
                        className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isMe
                            ? 'bg-[#0b1a30] text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/80'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.text}</p>
                      </div>

                      {/* Timestamp & status */}
                      <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                        <span>{m.time}</span>
                        {isMe && (
                          m.id.startsWith('temp-') 
                            ? <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            : <CheckCheck className="w-3 h-3 text-emerald-600" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Starter Chips */}
            {isGroupChatActive ? (
              <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> Group Topics:
                </span>
                {groupStarterChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    disabled={isSending}
                    className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 whitespace-nowrap transition-colors border border-emerald-200/70 disabled:opacity-50 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : !isLandlord ? (
              <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-600" /> Quick Inquiries:
                </span>
                {directStarterChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    disabled={isSending}
                    className="text-[10.5px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-900 text-slate-700 whitespace-nowrap transition-colors border border-slate-200/70 disabled:opacity-50 cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            ) : null}

            {/* Landlord Announcement Bar (If landlord in Group Chat) */}
            {isGroupChatActive && isLandlord && (
              <div className="px-3 py-1.5 bg-amber-50/70 border-t border-amber-200/60 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAnnouncementMode(!isAnnouncementMode)}
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                      isAnnouncementMode
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>{isAnnouncementMode ? 'Broadcast Announcement Mode' : 'Switch to Announcement'}</span>
                  </button>

                  {isAnnouncementMode && (
                    <select
                      value={announcementCategory}
                      onChange={(e) => setAnnouncementCategory(e.target.value)}
                      className="text-[10px] font-bold bg-white border border-amber-300 rounded-lg px-2 py-0.5 text-amber-950 focus:outline-none cursor-pointer"
                    >
                      {ANNOUNCEMENT_CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  )}
                </div>

                <span className="text-[10px] text-amber-800 font-medium hidden sm:inline">
                  {isAnnouncementMode ? 'All boarders will receive this notice' : 'Broadcasting as Host'}
                </span>
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  isGroupChatActive
                    ? (isLandlord 
                        ? (isAnnouncementMode ? "Type official broadcast announcement to all boarders..." : "Message pad group as Host...") 
                        : "Message pad group & co-boarders...")
                    : (isLandlord 
                        ? "Type your direct reply to the student..." 
                        : `Ask ${currentLandlord.name} about rooms, curfew, amenities...`)
                }
                disabled={isSending}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0b1a30] focus:ring-1 focus:ring-[#0b1a30] disabled:opacity-70 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || isSending}
                className={`px-4 py-2.5 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0 ${
                  isGroupChatActive && isLandlord && isAnnouncementMode
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-[#0b1a30] hover:bg-[#152a4d]'
                }`}
                title="Send real message"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
