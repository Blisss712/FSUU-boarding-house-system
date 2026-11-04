import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare, Plus, Search, X, Send, Users, ArrowLeft,
  UserPlus, Loader2, ShieldCheck, Check
} from 'lucide-react';
import { api } from '../services/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MAX_MESSAGE_LENGTH = 4000;

function personInitials(person) {
  if (!person) return '??';
  if (person.avatarInitials) return person.avatarInitials;
  if (person.name) {
    const parts = String(person.name).trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() || '??';
  }
  if (person.email) return String(person.email).slice(0, 2).toUpperCase();
  return '??';
}

function personTone(person) {
  if (person?.role === 'admin') return 'bg-purple-700';
  if (person?.role === 'landlord') return 'bg-amber-500';
  return 'bg-[#0b1a30]';
}

function roleLabel(role) {
  if (role === 'landlord') return 'Landlord';
  if (role === 'admin') return 'Auditor';
  return 'Student';
}

function sameDay(first, second) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

function formatClock(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatStamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  if (sameDay(date, now)) return formatClock(date);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDayLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (sameDay(date, now)) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function conversationTitle(conv) {
  if (!conv) return '';
  if (conv.isGroup) return conv.title || 'Group chat';
  const other = conv.otherMembers?.[0]?.user;
  return other?.name || other?.email || 'Direct message';
}

function memberName(conv, userId) {
  const member = conv?.members?.find(item => item.userId === userId);
  return member?.user?.name || 'Member';
}

function conversationPreview(conv, currentUserId) {
  const last = conv.lastMessage;
  if (!last) return 'No messages yet';

  const prefix = last.senderId === currentUserId
    ? 'You: '
    : conv.isGroup
      ? `${memberName(conv, last.senderId)}: `
      : '';
  return `${prefix}${last.body}`;
}

function Avatar({ person, group = false, size = 'md' }) {
  const dimensions = size === 'sm'
    ? 'w-7 h-7 text-[10px]'
    : size === 'lg'
      ? 'w-11 h-11 text-sm'
      : 'w-10 h-10 text-xs';

  if (group) {
    return (
      <div className={`${dimensions} rounded-2xl bg-[#0b1a30] text-amber-400 flex items-center justify-center shrink-0`}>
        <Users className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </div>
    );
  }

  return (
    <div className={`${dimensions} rounded-full ${personTone(person)} text-white font-black flex items-center justify-center shrink-0`}>
      {personInitials(person)}
    </div>
  );
}

function NewChatModal({ canCreateGroup, contacts, loading, busy, onClose, onCreateDirect, onCreateGroup }) {
  const [mode, setMode] = useState('direct');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [title, setTitle] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return contacts;

    return contacts.filter(contact =>
      String(contact.name || '').toLowerCase().includes(needle)
      || String(contact.email || '').toLowerCase().includes(needle)
      || String(contact.role || '').toLowerCase().includes(needle)
    );
  }, [contacts, query]);

  const toggleSelected = (id) => {
    setSelected(previous =>
      previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]
    );
  };

  const handleSubmitGroup = (event) => {
    event.preventDefault();
    if (busy) return;
    onCreateGroup(title, selected);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[86vh] flex flex-col shadow-2xl border border-slate-100">

        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">New message</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {canCreateGroup
                ? 'Start a direct chat or create a group you manage.'
                : 'Pick someone to start a direct chat.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {canCreateGroup && (
          <div className="px-5 pt-3">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              {[
                { id: 'direct', label: 'Direct' },
                { id: 'group', label: 'Group' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                    mode === tab.id
                      ? 'bg-white text-[#0b1a30] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'group' && canCreateGroup && (
          <div className="px-5 pt-3">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
              Group name
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              placeholder="e.g. Sunrise Boarding House 2026"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20"
            />
          </div>
        )}

        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, email, or role"
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="py-10 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
              <p className="text-[11px] font-bold text-slate-500">Loading people…</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-[11px] text-slate-500">
              No accounts match that search.
            </p>
          ) : (
            filtered.map(contact => {
              const isSelected = selected.includes(contact.id);
              return (
                <button
                  key={contact.id}
                  onClick={() => (mode === 'group' ? toggleSelected(contact.id) : onCreateDirect(contact.id))}
                  disabled={busy}
                  className="w-full text-left flex items-center gap-3 px-2.5 py-2 rounded-2xl hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  <Avatar person={contact} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-slate-800 truncate">{contact.name || 'Account'}</p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {roleLabel(contact.role)}{contact.course ? ` · ${contact.course}` : ''}
                    </p>
                  </div>
                  {mode === 'group' && (
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-[#0b1a30] border-[#0b1a30] text-white'
                        : 'border-slate-300 text-transparent'
                    }`}>
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {mode === 'group' && canCreateGroup && (
          <form onSubmit={handleSubmitGroup} className="p-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={busy || !title.trim() || selected.length === 0}
              className="w-full py-3 rounded-2xl bg-[#0b1a30] hover:bg-[#152a4d] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
            >
              {busy ? 'Creating group…' : `Create group${selected.length ? ` (${selected.length})` : ''}`}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Only you, as the landlord, can add or remove members later.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function GroupMembersModal({
  conversation, currentUserId, canManage, contacts, loading, busy, onClose, onAdd, onRemove
}) {
  const [query, setQuery] = useState('');
  const members = conversation.members || [];

  const available = contacts
    .filter(contact => !members.some(member => member.userId === contact.id))
    .filter(contact => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return String(contact.name || '').toLowerCase().includes(needle)
        || String(contact.email || '').toLowerCase().includes(needle)
        || String(contact.role || '').toLowerCase().includes(needle);
    });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[86vh] flex flex-col shadow-2xl border border-slate-100">

        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              {conversation.title || 'Group chat'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className={`p-3 rounded-2xl border flex items-start gap-2 ${
            canManage
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="text-[11px] font-medium leading-relaxed">
              {canManage
                ? 'You are the landlord of this group, so you can add and remove members.'
                : 'Only the group landlord can add or remove members.'}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
              Members
            </h4>
            <div className="space-y-1">
              {members.map(member => {
                const isGroupLandlord = member.role === 'landlord';
                return (
                  <div key={member.userId} className="flex items-center gap-3 px-1 py-2">
                    <Avatar person={member.user} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-800 truncate">
                        {member.user?.name || 'Member'}
                        {member.userId === currentUserId ? ' (you)' : ''}
                      </p>
                      <p className="text-[10.5px] text-slate-500 truncate">
                        {isGroupLandlord
                          ? 'Landlord · controls access'
                          : roleLabel(member.user?.role)}
                      </p>
                    </div>
                    {canManage && !isGroupLandlord && (
                      <button
                        onClick={() => onRemove(member.userId)}
                        disabled={busy}
                        className="px-2.5 py-1.5 rounded-xl border border-red-200 text-red-600 text-[10.5px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {canManage && (
            <section>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-2">
                Add people
              </h4>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search accounts"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20"
                />
              </div>

              {loading ? (
                <div className="py-6 text-center">
                  <Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto" />
                </div>
              ) : available.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-3">
                  Everyone matching your search is already in this group.
                </p>
              ) : (
                <div className="space-y-1">
                  {available.map(contact => (
                    <div key={contact.id} className="flex items-center gap-3 px-1 py-2">
                      <Avatar person={contact} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-800 truncate">{contact.name || 'Account'}</p>
                        <p className="text-[10.5px] text-slate-500 truncate">{roleLabel(contact.role)}</p>
                      </div>
                      <button
                        onClick={() => onAdd(contact.id)}
                        disabled={busy}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 text-[#0b1a30] text-[10.5px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MessagesView({ user, onOpenAuth }) {
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);

  const activeIdRef = useRef(null);
  const messageRequestRef = useRef(0);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    if (!user) return [];

    setLoadingConversations(true);
    try {
      const list = await api.getConversations();
      setConversations(list);
      return list;
    } catch (err) {
      setError(err.message || 'Could not load your chats.');
      return [];
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  const openConversation = useCallback(async (conv) => {
    if (!conv?.id) return;

    const requestId = messageRequestRef.current + 1;
    messageRequestRef.current = requestId;

    setActiveId(conv.id);
    activeIdRef.current = conv.id;
    setShowMembers(false);
    setMessages([]);
    setError('');
    setLoadingMessages(true);
    setConversations(previous =>
      previous.map(item => (item.id === conv.id ? { ...item, unreadCount: 0 } : item))
    );

    try {
      const rows = await api.getMessages(conv.id);
      if (requestId !== messageRequestRef.current) return;
      setMessages(rows);
      await api.markConversationRead(conv.id);
    } catch (err) {
      if (requestId === messageRequestRef.current) {
        setError(err.message || 'Could not open this chat.');
      }
    } finally {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setActiveId(null);
      activeIdRef.current = null;
      setMessages([]);
      setDraft('');
      return;
    }
    loadConversations();
  }, [user, loadConversations]);

  // Live updates: new messages and group membership changes.
  useEffect(() => {
    if (!user || !isSupabaseConfigured) return undefined;

    const channel = supabase
      .channel(`balay-messages-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const incoming = payload.new;
        if (!incoming) return;

        if (incoming.conversationId === activeIdRef.current) {
          if (incoming.senderId !== user.id) {
            setMessages(previous =>
              previous.some(item => item.id === incoming.id) ? previous : [...previous, incoming]
            );
            api.markConversationRead(incoming.conversationId).catch(() => {});
          }
          setConversations(previous =>
            previous.map(item =>
              item.id === incoming.conversationId ? { ...item, unreadCount: 0 } : item
            )
          );
        }

        loadConversations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadConversations]);

  // Re-sync when the tab regains focus (covers sleeping tabs / missed events).
  useEffect(() => {
    if (!user) return undefined;

    const handleFocus = () => loadConversations();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user, loadConversations]);

  // Keep the newest message in view.
  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length, activeId]);

  // People picker data is only needed while one of the modals is open.
  useEffect(() => {
    if (!showNewChat && !showMembers) return undefined;

    let cancelled = false;
    setContactsLoading(true);

    api.getMessageContacts()
      .then(list => {
        if (!cancelled) setContacts(list);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not load contacts.');
      })
      .finally(() => {
        if (!cancelled) setContactsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showNewChat, showMembers]);

  const activeConversation = useMemo(
    () => conversations.find(conv => conv.id === activeId) || null,
    [conversations, activeId]
  );

  const visibleConversations = useMemo(() => {
    const needle = listSearch.trim().toLowerCase();
    if (!needle) return conversations;

    return conversations.filter(conv =>
      conversationTitle(conv).toLowerCase().includes(needle)
      || String(conv.lastMessage?.body || '').toLowerCase().includes(needle)
    );
  }, [conversations, listSearch]);

  const otherUser = activeConversation?.otherMembers?.[0]?.user || null;
  const groupMembers = activeConversation?.members || [];
  const canManageGroup = Boolean(
    activeConversation?.isGroup
    && (user?.role === 'landlord' || user?.role === 'admin')
    && String(activeConversation?.createdBy) === String(user?.id)
  );

  const handleSend = useCallback(async (event) => {
    event?.preventDefault();

    const body = draft.trim();
    if (!body || !activeId || sending) return;
    if (body.length > MAX_MESSAGE_LENGTH) {
      setError('Message is too long (4,000 characters max).');
      return;
    }

    setSending(true);
    setError('');

    try {
      const sent = await api.sendMessage(activeId, body);
      setDraft('');
      if (sent) {
        setMessages(previous =>
          previous.some(item => item.id === sent.id) ? previous : [...previous, sent]
        );
      }
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }, [draft, activeId, sending, loadConversations]);

  const handleComposerKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleStartDirect = async (contactId) => {
    setCreating(true);
    setError('');

    try {
      const conversationId = await api.startDirectConversation(contactId);
      setShowNewChat(false);
      const list = await loadConversations();
      const target = list.find(conv => conv.id === conversationId);
      if (target) openConversation(target);
    } catch (err) {
      setError(err.message || 'Could not start that conversation.');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateGroup = async (title, memberIds) => {
    setCreating(true);
    setError('');

    try {
      const conversationId = await api.createGroupConversation(title, memberIds);
      setShowNewChat(false);
      const list = await loadConversations();
      const target = list.find(conv => conv.id === conversationId);
      if (target) openConversation(target);
    } catch (err) {
      setError(err.message || 'Could not create the group.');
    } finally {
      setCreating(false);
    }
  };

  const handleAddMembers = async (contactId) => {
    if (!activeId || !contactId) return;

    setMemberBusy(true);
    setError('');

    try {
      await api.addGroupMembers(activeId, [contactId]);
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Could not add that member.');
    } finally {
      setMemberBusy(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!activeId || !memberId) return;
    if (typeof window !== 'undefined' && !window.confirm('Remove this member from the group?')) return;

    setMemberBusy(true);
    setError('');

    try {
      await api.removeGroupMember(activeId, memberId);
      await loadConversations();
    } catch (err) {
      setError(err.message || 'Could not remove that member.');
    } finally {
      setMemberBusy(false);
    }
  };

  const closeActiveConversation = () => {
    messageRequestRef.current += 1;
    setActiveId(null);
    activeIdRef.current = null;
    setMessages([]);
    setDraft('');
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-sm w-full text-center bg-white rounded-3xl border border-slate-200 shadow-xs p-8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#0b1a30] text-amber-400 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h2 className="font-extrabold text-base text-slate-800">Messages</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Sign in to chat directly with landlords and students, or to join a group chat for your boarding house.
          </p>
          <div className="flex gap-2 justify-center pt-1">
            <button
              onClick={() => onOpenAuth?.('login')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0b1a30] text-white hover:bg-[#1a3a6b] transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button
              onClick={() => onOpenAuth?.('signup')}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-[#0b1a30] text-[#0b1a30] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-0 pb-2">
      <div className="max-w-6xl mx-auto">

        {error && (
          <div className="mb-2 flex items-start gap-2 rounded-2xl bg-red-50 border border-red-200 px-3 py-2 text-[11.5px] text-red-700 font-medium">
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError('')}
              className="shrink-0 text-red-500 hover:text-red-700"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex h-[calc(100dvh-250px)] min-h-[440px] md:h-[calc(100dvh-220px)] lg:h-[calc(100dvh-190px)]">

          {/* ── Conversation list ───────────────────────────────────────── */}
          <aside className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-[300px] lg:w-[340px] shrink-0 flex-col border-r border-slate-100 min-h-0`}>

            <div className="px-3 sm:px-4 py-3.5 flex items-center justify-between gap-2 border-b border-slate-100">
              <div>
                <h2 className="font-extrabold text-base text-[#0b1a30] leading-tight">Messages</h2>
                <p className="text-[10.5px] text-slate-500">
                  {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
                </p>
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0b1a30] hover:bg-[#152a4d] text-white text-[11px] font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>

            <div className="p-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(event) => setListSearch(event.target.value)}
                  placeholder="Search chats"
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
              {loadingConversations && conversations.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                  <p className="text-[11px] font-bold text-slate-500">Loading your chats…</p>
                </div>
              ) : visibleConversations.length === 0 ? (
                <div className="py-10 px-3 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    {listSearch ? 'No chats match that search' : 'No messages yet'}
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {listSearch
                      ? 'Try a different name or keyword.'
                      : 'Start a direct chat with a landlord or student, or create a group for your pad.'}
                  </p>
                </div>
              ) : (
                visibleConversations.map(conv => {
                  const isActive = conv.id === activeId;
                  const isGroup = Boolean(conv.isGroup);
                  const other = conv.otherMembers?.[0]?.user || null;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => openConversation(conv)}
                      className={`w-full text-left flex items-center gap-3 px-2.5 py-2.5 rounded-2xl transition-colors ${
                        isActive ? 'bg-slate-100' : 'hover:bg-slate-50'
                      }`}
                    >
                      <Avatar person={isGroup ? null : other} group={isGroup} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="font-bold text-[13px] text-slate-800 truncate flex-1">
                            {conversationTitle(conv)}
                          </p>
                          {conv.lastMessage && (
                            <span className="text-[9.5px] text-slate-400 shrink-0">
                              {formatStamp(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className={`text-[11.5px] truncate flex-1 ${
                            conv.unreadCount > 0 ? 'text-slate-700 font-semibold' : 'text-slate-500'
                          }`}>
                            {conversationPreview(conv, user.id)}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#0b1a30] text-white text-[9.5px] font-black flex items-center justify-center shrink-0">
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ── Chat thread ─────────────────────────────────────────────── */}
          <section className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col min-h-0 bg-slate-50/60`}>
            {!activeConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
                <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center mx-auto shadow-xs">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-800 mt-4">Pick up where you left off</h3>
                <p className="text-[11.5px] text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Select a conversation, or start a new one to reach a landlord or a fellow student.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 border-b border-slate-100 bg-white">
                  <button
                    onClick={closeActiveConversation}
                    className="md:hidden w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
                    title="Back to chats"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <Avatar
                    person={activeConversation.isGroup ? null : otherUser}
                    group={activeConversation.isGroup}
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className="font-extrabold text-[13px] sm:text-sm text-[#0b1a30] truncate">
                      {conversationTitle(activeConversation)}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 truncate">
                      {activeConversation.isGroup
                        ? `${groupMembers.length} ${groupMembers.length === 1 ? 'member' : 'members'}${canManageGroup ? ' · You manage access' : ''}`
                        : `${roleLabel(otherUser?.role)}${otherUser?.course ? ` · ${otherUser.course}` : ''}`}
                    </p>
                  </div>

                  {activeConversation.isGroup && (
                    <button
                      onClick={() => setShowMembers(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors shrink-0"
                      title="View group members"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Members</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 space-y-1.5">
                  {loadingMessages ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-300 flex items-center justify-center">
                        <Send className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 mt-3">Say hello</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        This is the start of your conversation.
                      </p>
                    </div>
                  ) : (
                    messages.map((message, index) => {
                      const previous = messages[index - 1];
                      const createdAt = new Date(message.createdAt);
                      const previousAt = previous ? new Date(previous.createdAt) : null;
                      const showDay = !previousAt || !sameDay(previousAt, createdAt);
                      const isMine = message.senderId === user.id;
                      const sender = groupMembers.find(member => member.userId === message.senderId)?.user || null;

                      return (
                        <React.Fragment key={message.id}>
                          {showDay && (
                            <div className="flex items-center gap-2 py-2">
                              <span className="h-px flex-1 bg-slate-200" />
                              <span className="text-[9.5px] font-black uppercase tracking-wider text-slate-400">
                                {formatDayLabel(message.createdAt)}
                              </span>
                              <span className="h-px flex-1 bg-slate-200" />
                            </div>
                          )}

                          <div className={`flex gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {!isMine && activeConversation.isGroup && (
                              <Avatar person={sender} size="sm" />
                            )}

                            <div className={`flex flex-col max-w-[82%] sm:max-w-[68%] ${isMine ? 'items-end' : 'items-start'}`}>
                              {!isMine && activeConversation.isGroup && (
                                <span className="text-[10px] font-bold text-slate-500 mb-0.5 px-1">
                                  {sender?.name || 'Member'}
                                </span>
                              )}

                              <div className={`px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words rounded-2xl ${
                                isMine
                                  ? 'bg-[#0b1a30] text-white rounded-br-md'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-2xs'
                              }`}>
                                {message.body}
                              </div>

                              <span className="text-[9.5px] text-slate-400 mt-0.5 px-1">
                                {formatClock(message.createdAt)}
                              </span>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <form onSubmit={handleSend} className="border-t border-slate-100 bg-white p-2.5 sm:p-3 flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    rows={1}
                    maxLength={MAX_MESSAGE_LENGTH}
                    placeholder="Write a message…"
                    className="flex-1 resize-none max-h-28 px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b1a30]/20"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="w-10 h-10 rounded-full bg-[#0b1a30] hover:bg-[#152a4d] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors shrink-0"
                    title="Send message"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {showNewChat && (
        <NewChatModal
          canCreateGroup={user.role === 'landlord' || user.role === 'admin'}
          contacts={contacts}
          loading={contactsLoading}
          busy={creating}
          onClose={() => setShowNewChat(false)}
          onCreateDirect={handleStartDirect}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {showMembers && activeConversation?.isGroup && (
        <GroupMembersModal
          conversation={activeConversation}
          currentUserId={user.id}
          canManage={canManageGroup}
          contacts={contacts}
          loading={contactsLoading}
          busy={memberBusy}
          onClose={() => setShowMembers(false)}
          onAdd={handleAddMembers}
          onRemove={handleRemoveMember}
        />
      )}
    </div>
  );
}
