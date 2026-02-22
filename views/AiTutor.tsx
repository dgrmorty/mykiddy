import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { askAiTutor, getAiUsageQuota } from '../services/geminiService';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, Zap, Code, HelpCircle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useContent } from '../hooks/useContent';
import { AccessGate } from '../components/AccessGate';
import { sanitizeInput, isPotentialInjection } from '../utils/security';
import { supabase } from '../services/supabase';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

const SUGGESTIONS = [
    { label: "Объясни код", icon: <Code size={14} />, prompt: "Можешь объяснить этот код простыми словами?" },
    { label: "Дай подсказку", icon: <Zap size={14} />, prompt: "Мне нужна небольшая подсказка по текущей теме." },
    { label: "Примеры", icon: <HelpCircle size={14} />, prompt: "Где это применяется в реальных проектах?" },
];

export const AiTutor: React.FC = () => {
  const { requireAuth, isGuest, user } = useAuth();
  const { courses } = useContent();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'ai', text: "Привет! Я твой персональный наставник. Есть вопросы по урокам или хочешь разобрать сложный код? Я готов помочь!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quota, setQuota] = useState<{ tutor_remaining: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentContext = courses[0]?.title || "Основы IT";

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

    const injectionError = isPotentialInjection(cleanInput);
    if (injectionError) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: "Извините, я не могу выполнить этот запрос из-за политики безопасности." }]);
        return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token ?? null;

    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: cleanInput }]);
    setInput('');
    setLoading(true);

    try {
        const aiResponseText = await askAiTutor(cleanInput, currentContext, accessToken);
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: aiResponseText }]);
        if (quota !== null && quota.tutor_remaining > 0) {
          setQuota((q) => (q ? { tutor_remaining: q.tutor_remaining - 1 } : null));
        }
    } catch (e: any) {
        const msg = e?.message || "Извините, возникла ошибка связи. Попробуйте еще раз.";
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'ai', text: msg }]);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isGuest && !user.isApproved) return <AccessGate />;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col animate-slide-up max-w-5xl mx-auto">
       <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-4xl font-display font-bold text-white tracking-tight flex items-center gap-4">
                Ваш <span className="text-kiddy-primary">Наставник</span>
                <Sparkles className="text-kiddy-primary/40" size={24} />
            </h1>
            {!isGuest && quota !== null && (
              <p className="text-zinc-500 text-sm font-medium">
                Запросов сегодня: <span className="text-white">{quota.tutor_remaining}</span>
              </p>
            )}
       </header>

       <Card className="flex-1 flex flex-col overflow-hidden bg-zinc-950/40 border-zinc-800/60 shadow-2xl rounded-[2.5rem]" noPadding>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-kiddy-primary text-white shadow-lg shadow-kiddy-primary/20' : 'bg-zinc-800 text-zinc-400'}`}>
                        {msg.role === 'ai' ? <Bot size={20} /> : <UserIcon size={20} />}
                    </div>
                    <div className={`max-w-[75%] p-6 rounded-[1.8rem] text-sm leading-relaxed shadow-xl border ${msg.role === 'user' ? 'bg-zinc-900 border-zinc-800 text-white rounded-tr-none' : 'bg-black border-zinc-900 text-zinc-300 rounded-tl-none'}`}>
                        {msg.text}
                    </div>
                </div>
            ))}
            {loading && (
                <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-kiddy-primary flex items-center justify-center"><Loader2 className="animate-spin text-white" size={20} /></div>
                    <div className="p-6 bg-black border border-zinc-900 rounded-[1.8rem] rounded-tl-none"><p className="text-zinc-500 text-xs animate-pulse font-bold uppercase tracking-widest">Анализирую...</p></div>
                </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="p-8 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-900">
             <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar">
                {SUGGESTIONS.map((s, idx) => (
                    <button key={idx} onClick={() => handleSend(s.prompt)} className="flex-shrink-0 flex items-center gap-3 px-5 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-[10px] text-zinc-400 font-bold uppercase tracking-widest hover:bg-zinc-800 hover:text-white transition-all">
                        {s.icon} {s.label}
                    </button>
                ))}
             </div>
             <div className="flex gap-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Задай свой вопрос..."
                    className="flex-1 bg-black border border-zinc-800 rounded-[1.5rem] px-8 py-5 text-white focus:outline-none focus:border-kiddy-primary transition-all text-sm"
                />
                <button onClick={() => handleSend()} className="bg-white text-black rounded-[1.5rem] px-10 py-5 font-bold hover:bg-kiddy-primary hover:text-white transition-all transform active:scale-95 shadow-xl">
                   {isGuest ? <Lock size={20} /> : <Send size={20} />}
                </button>
             </div>
          </div>
       </Card>
    </div>
  );
};