import React, { useState } from 'react';
import { X, Send, MessageCircle, CheckCheck, ShieldCheck } from 'lucide-react';

export default function ChatModal({ property, onClose }) {
  if (!property) return null;

  const [messages, setMessages] = useState([
    {
      sender: 'landlord',
      time: '10:15 AM',
      text: `Hello! I'm ${property.landlord.name}. Welcome to ${property.name}. How can I assist you with your room inquiry for this semester?`
    }
  ]);
  const [inputText, setInputText] = useState('');

  const quickQuestions = [
    'Curfew pass for hospital duties?',
    'Is water pressure strong at 6:30 AM?',
    'Allowed bang magdala ng induction cooker?'
  ];

  const handleSendMessage = (customText) => {
    const text = customText || inputText;
    if (!text.trim()) return;

    setMessages(prev => [...prev, {
      sender: 'student',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text
    }]);
    setInputText('');

    setTimeout(() => {
      let reply = `Salamat sa tanong! Yes po, very welcome yan dito sa ${property.name}. Meron tayong booster pump at solar emergency backup para panatag kayo sa inyong studies.`;
      if (text.toLowerCase().includes('curfew') || text.toLowerCase().includes('hospital')) {
        reply = `Yes po! Para sa mga Nursing / Medical Tech / Criminology students na may night hospital duty, nag-iissue tayo ng digital night gate pass with our on-site caretaker.`;
      } else if (text.toLowerCase().includes('water') || text.toLowerCase().includes('pressure')) {
        reply = `Yes po, fully tested ang 1,000L overhead tank + booster pump natin. Kahit sabay-sabay maligo bago mag-7:30 AM classes, malakas ang agos ng tubig.`;
      }

      setMessages(prev => [...prev, {
        sender: 'landlord',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: reply
      }]);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-5 shadow-2xl border border-slate-100 my-auto flex flex-col h-[520px] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-900 relative">
              {property.landlord.initials}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"></span>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <h4 className="font-extrabold text-sm text-slate-900">{property.landlord.name}</h4>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded font-bold">
                  Verified Host
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{property.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'student' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'student'
                    ? 'bg-[#0f244a] text-white rounded-tr-xs'
                    : 'bg-slate-100 text-slate-800 rounded-tl-xs'
                }`}
              >
                <p>{m.text}</p>
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5 px-1 font-mono">
                {m.time}
              </span>
            </div>
          ))}
        </div>

        {/* Quick chips */}
        <div className="py-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition-colors border border-slate-200/80"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input */}
        <div className="pt-2 border-t border-slate-100 flex gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your question to landlady..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="px-3.5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
