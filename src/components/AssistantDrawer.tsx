import React, { useState } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import { queryAssistant } from '../services/api';

interface AssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  evaluationId?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AssistantDrawer: React.FC<AssistantDrawerProps> = ({
  isOpen,
  onClose,
  evaluationId,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hello! I am the **Bayora AI Security Assistant**. I am grounded in your stored models, test evaluations, and security policies. How can I assist you with model safety today?`,
      timestamp: 'Just now'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const cannedPrompts = [
    'Why did the latest evaluation fail?',
    'Recommend policy improvements',
    'Compare model security posture',
    'Explain Prompt Injection risk'
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await queryAssistant(text, evaluationId);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.response,
        timestamp: 'Just now'
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Apologies, I encountered an error querying security records: ${err.message}`,
          timestamp: 'Just now'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white/95 backdrop-blur-xl border-l border-slate-200/90 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#8762E0] to-[#B39BF5] flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <span>Security Copilot</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700">
                Grounded
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Deterministic evidence synthesis
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Notice Banner */}
      <div className="px-5 py-2.5 bg-[#f4efff]/60 border-b border-[#e5d9fd]/60 text-[11px] text-[#7952D8] flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#8762E0]" />
        <span>Grounded strictly on actual SQLite evaluations and active policies.</span>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${
              m.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-[#9B7DE8] to-[#8762e0] text-white shadow-xs rounded-br-xs'
                  : 'bg-slate-100/80 text-slate-800 border border-slate-200/60 rounded-bl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">
              {m.role === 'user' ? 'You' : 'Bayora Assistant'} · {m.timestamp}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <span className="w-2 h-2 rounded-full bg-[#8762E0] animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-[#8762E0] animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-[#8762E0] animate-bounce [animation-delay:0.4s]" />
            <span>Analyzing evaluation evidence...</span>
          </div>
        )}
      </div>

      {/* Canned Quick Prompts */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
        <div className="text-[10px] uppercase font-semibold text-slate-400 mb-1.5">
          Suggested Inquiries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cannedPrompts.map((cp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(cp)}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#7952D8] hover:border-[#9B7DE8] hover:bg-purple-50/30 transition-all cursor-pointer shadow-2xs"
            >
              {cp}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-slate-200/80 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about evaluation findings, policies, or model safety..."
            className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-hidden focus:border-[#9B7DE8] focus:bg-white transition-all font-medium"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-2xl bg-[#9B7DE8] hover:bg-[#8762e0] text-white disabled:opacity-40 transition-colors shadow-xs cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
