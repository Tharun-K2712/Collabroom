'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, Bot, User, FileText, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface RoomAIChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomName: string;
}

export const RoomAIChatDrawer: React.FC<RoomAIChatDrawerProps> = ({
  isOpen,
  onClose,
  roomId,
  roomName,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `👋 Hello! I am **RoomAI**, your intelligent workspace document assistant. You can ask me to summarize files, extract requirements, compare architecture blueprints, or find specific details strictly within **${roomName}**.`,
    },
  ]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const samplePrompts = [
    'Summarize our room documents',
    'What are the key requirements and architecture specs?',
    'List all project deliverables and deadlines',
  ];

  const handleSend = async (questionToSend?: string) => {
    const q = questionToSend || query;
    if (!q.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: q.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await api.post<any>('/ai/ask', {
        roomId,
        query: q.trim(),
      });

      if (res.success && res.data) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: res.data.answer,
          sources: res.data.sources,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(res.message || 'Failed to process AI query');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Sorry, I could not complete your request: ${err.message || 'Unknown error'}. Please try asking in a different way.`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
          />

          {/* Chat Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-[#0B132B] border-l border-border shadow-2xl flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="p-5 border-b border-border/80 bg-card/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-text text-sm">RoomAI Assistant</h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" /> RBAC Protected
                    </span>
                  </div>
                  <p className="text-[11px] text-muted truncate max-w-[280px]">
                    Context: {roomName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-muted hover:text-white rounded-lg hover:bg-card-hover"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 scrollbar-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 text-xs leading-relaxed ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-4 h-4 text-primary-light" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] p-4 rounded-2xl ${
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-br-none shadow-md'
                        : 'bg-card border border-border text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed space-y-1">
                      {m.content}
                    </div>

                    {/* Cited Sources */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-border/60">
                        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-primary-light" />
                          Verified Room Sources
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {m.sources.map((src, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 bg-input/80 border border-border rounded text-[10px] text-slate-300 font-mono"
                            >
                              {src}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-secondary/30 border border-secondary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-secondary-light" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 text-xs justify-start">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-light animate-pulse" />
                  </div>
                  <div className="bg-card border border-border p-3.5 rounded-2xl rounded-bl-none flex items-center gap-2 text-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-primary-light" />
                    <span>Analyzing room documents & generating answer...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Prompts */}
            <div className="px-5 py-2 flex flex-wrap gap-1.5 border-t border-border/40 bg-card/30">
              {samplePrompts.map((p, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSend(p)}
                  className="text-[11px] px-2.5 py-1 rounded-full bg-input/80 hover:bg-card border border-border text-muted hover:text-white transition-colors"
                >
                  ⚡ {p}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-4 border-t border-border bg-card/70">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask RoomAI anything about this workspace..."
                  className="flex-1 bg-input border border-border rounded-xl px-3.5 py-2.5 text-xs text-text focus:outline-none focus:border-primary"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  disabled={!query.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
