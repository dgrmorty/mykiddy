import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { askAiTutor, getAiUsageQuota } from '../services/geminiService';
import { Send, Bot, User as UserIcon, Code, Zap, HelpCircle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../hooks/useContent';
import { AccessGate } from '../components/AccessGate';
import { sanitizeInput, isPotentialInjection } from '../utils/security';
import { supabase } from '../services/supabase';
import { AnimatedAiCore } from '../components/ui/AnimatedAiCore';
import { AnimatedIcon } from '../components/ui/AnimatedIcon';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTIONS = [
  { label: 'Объяснить код', icon: Code, prompt: 'Можешь объяснить этот код простыми словами?' },
  { label: 'Дать подсказку', icon: Zap, prompt: 'Мне нужна небольшая подсказка по текущей теме.' },
  { label: 'Привести пример', icon: HelpCircle, prompt: 'Где это применяется в реальных проектах?' },
];

export const AiTutor: React.FC = () => {
  const { requireAuth, isGuest, user } = useAuth();
  const { courses } = useContent(user?.id !== 'guest' ? user?.id : undefined);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', text: 'Привет! Я твой наставник. Задай вопрос по урокам или попроси разобрать код.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ tutor_remaining: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentContext = courses[0]?.title || 'Основы IT';

  useEffect(() => {
    if (isGuest) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session?.access_token) return;
      getAiUsageQuota(session.access_token).then((q) => {
        if (!cancelled) setQuota({ tutor_remaining: q.tutor_remaining });
      });
    });
    return () => { cancelled = true; };
  }, [isGuest, messages]);

  const handleSend = async (text: string = input) => {
    if (isGuest) { requireAuth(); return; }
    const cleanInput = sanitizeInput(text.trim());
    if (!cleanInput || loading) return;
    if (isPotentialInjection(cleanInput)) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: 'Извините, я не могу выполнить этот запрос из-за политики безопасности.' }]);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: cleanInput }]);
    setInput('');
    setLoading(true);
    try {
      const aiResponseText = await askAiTutor(cleanInput, currentContext, session?.access_token ?? null);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: aiResponseText }]);
      if (quota !== null && quota.tutor_remaining > 0) setQuota(q => q ? { tutor_remaining: q.tutor_remaining - 1 } : null);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: e?.message || 'Ошибка связи. Попробуйте ещё раз.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isGuest && !user.isApproved) return <AccessGate />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] max-w-4xl mx-auto animate-slide-up-fade">
      <header className="flex items-center justify-between gap-4 mb-8 px-2">
        <h1 className="font-display font-bold text-3xl md:text-4xl text-white tracking-tight flex items-center gap-3">
          Наставник
          <AnimatedIcon name="sparkle" size={28} className="text-white" />
        </h1>
        {!isGuest && quota !== null && (
          <span className="text-sm font-semibold text-kiddy-textSecondary">
            Осталось запросов: <span className="text-white">{quota.tutor_remaining}</span>
          </span>
        )}
      </header>

      <Card noPadding className="flex-1 flex flex-col overflow-hidden min-h-0 bg-kiddy-surfaceElevated border border-white/[0.04]">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${msg.role === 'ai' ? 'bg-kiddy-cherry text-white' : 'bg-kiddy-surfaceHighlight text-white'}`}>
                {msg.role === 'ai' ? <Bot size={20} strokeWidth={2} /> : <UserIcon size={20} strokeWidth={2} />}
              </div>
              <div className={`max-w-[85%] md:max-w-[75%] px-6 py-4 rounded-2xl text-body leading-relaxed ${msg.role === 'user' ? 'bg-kiddy-surfaceHighlight text-white rounded-tr-sm' : 'bg-transparent text-white'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <div className="shrink-0 w-10 h-10 flex items-center justify-center">
                <AnimatedAiCore size={40} />
              </div>
              <div className="px-6 py-4">
                <p className="text-sm font-semibold text-kiddy-textSecondary animate-pulse">Печатает...</p>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 md:p-6 bg-kiddy-surfaceElevated border-t border-white/[0.04]">
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(s.prompt)}
                className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-full border border-white/[0.08] bg-kiddy-surfaceElevated border border-white/[0.04] text-sm font-semibold text-white hover:bg-kiddy-surfaceHighlight transition-colors"
              >
                <s.icon size={16} strokeWidth={2} />
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Напишите сообщение..."
              className="input-premium flex-1 px-6 py-4 text-base"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              className="btn-cta shrink-0 w-14 h-14 rounded-full flex items-center justify-center"
              aria-label="Отправить"
            >
              {isGuest ? <Lock size={24} strokeWidth={2} /> : <Send size={24} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
