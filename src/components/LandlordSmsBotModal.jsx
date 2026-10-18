import React, { useState } from 'react';
import { X, Send, Smartphone, CheckCheck, Bot, RefreshCw, ShieldCheck } from 'lucide-react';

export default function LandlordSmsBotModal({ properties, onUpdatePropertyAvailability, onClose }) {
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || 'villa-guingona');
  const property = properties.find(p => p.id === selectedPropertyId) || properties[0];

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      time: '10:00 AM',
      text: `Good morning Ma'am Corazon! Balay Urios Auto-Check: May 2 bedspaces pa ba available sa Villa Guingona Student Pad?

Reply 1 kung YES (Available pa)
Reply 0 kung FULL na

Salamat po sa pagiging verified partner!`
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendReply = (replyCode) => {
    const textToSend = replyCode || inputText;
    if (!textToSend.trim()) return;

    const newMsgs = [...messages, {
      sender: 'landlord',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend
    }];
    setMessages(newMsgs);
    setInputText('');
    setIsSending(true);

    setTimeout(() => {
      let botResponse = '';
      if (textToSend.trim() === '1') {
        botResponse = `Salamat Ma'am Corazon! Na-confirm po ang 2 Available Bedspaces sa Balay Urios app. Validated for next 14 days. Padayon! ✨`;
        onUpdatePropertyAvailability(property.id, 2, '2 Rooms Available', 'green');
      } else if (textToSend.trim() === '0') {
        botResponse = `Noted po! Minarkahan na pong "FULL / NO VACANCY" ang inyong listing para hindi na maistorbo ang inyong phone. I-text lang kami kung may bakante uli. Salamat!`;
        onUpdatePropertyAvailability(property.id, 0, 'Fully Booked (0 Vacancy)', 'orange');
      } else {
        botResponse = `Natanggap ang inyong update: "${textToSend}". Na-forward sa inyong property profile. Daghang salamat!`;
      }

      setMessages(prev => [...prev, {
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: botResponse
      }]);
      setIsSending(false);
    }, 900);
  };

  const handleReset = () => {
    setMessages([
      {
        sender: 'bot',
        time: '10:00 AM',
        text: `Good morning ${property.landlord.name}! Balay Urios Auto-Check: May available rooms/bedspaces pa ba sa ${property.name}?

Reply 1 kung YES (Available pa)
Reply 0 kung FULL na`
      }
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-700 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bot className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Landlord 1-Tap SMS Vacancy Bot
              </h3>
              <p className="text-[11px] text-slate-400">
                Automated Semaphore SMS check for non-tech landlords
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Explain Box */}
        <div className="mt-3 p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
          <p className="text-[11px] leading-relaxed">
            <span className="font-bold text-amber-400">Zero tech friction:</span> Older landlords in Butuan don't need to log in to any app. A simple SMS sent every 2 weeks lets them reply <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-bold">1</code> or <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-300 font-bold">0</code> to update live web listings instantly.
          </p>
        </div>

        {/* Property Selector */}
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          <label className="text-slate-400 font-medium text-[11px]">Testing as:</label>
          <select
            value={selectedPropertyId}
            onChange={(e) => {
              setSelectedPropertyId(e.target.value);
              handleReset();
            }}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.landlord.name} ({p.name})</option>
            ))}
          </select>
        </div>

        {/* Phone Mockup Screen */}
        <div className="mt-3 bg-slate-950 rounded-2xl border border-slate-800 p-3 space-y-3 min-h-[260px] max-h-[300px] overflow-y-auto flex flex-col justify-between">
          <div className="space-y-2.5">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${m.sender === 'landlord' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                    m.sender === 'landlord'
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 px-1 font-mono">
                  <span>{m.time}</span>
                  {m.sender === 'landlord' && <CheckCheck className="w-3 h-3 text-blue-400" />}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 italic">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                <span>Balay Urios SMS Gateway processing...</span>
              </div>
            )}
          </div>
        </div>

        {/* 1-Tap Quick Action Buttons */}
        <div className="mt-3">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">
            Simulate Landlord 1-Tap SMS Reply:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSendReply('1')}
              disabled={isSending}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <span>Reply "1" (Available)</span>
            </button>

            <button
              onClick={() => handleSendReply('0')}
              disabled={isSending}
              className="py-2.5 px-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <span>Reply "0" (Mark Full)</span>
            </button>
          </div>
        </div>

        {/* Custom text reply */}
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
            placeholder="Or type custom SMS reply..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            onClick={() => handleSendReply()}
            disabled={!inputText.trim() || isSending}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
