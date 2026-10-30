import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Страница не найдена — Дети В ТОПЕ';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return () => {
      document.title = prev;
      robots.remove();
    };
  }, []);

  return (
    <section className="hero-stage relative flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="hero-stage__grid" aria-hidden="true" />
      <div className="hero-stage__orb" aria-hidden="true" />
      <div className="relative z-10 flex flex-col items-center">
        <p className="eyebrow mb-5">Ошибка 404</p>
        <h1 className="hero-title font-display text-[5.5rem] font-semibold leading-none tracking-[-0.05em] md:text-[9rem]">
          4<span className="text-cherry-gradient">0</span>4
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base text-zinc-400 [text-wrap:balance] md:text-lg">
          Такой страницы нет. Возможно, ссылка устарела или в адресе опечатка.
        </p>
        <button type="button" onClick={() => navigate('/')} className="btn-cta group mt-9 h-14 px-8 text-[15px]">
          На главную
          <ArrowRight size={18} className="ml-2 transition-transform duration-300 ease-entrance group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  );
};
