import React from 'react';
import { Link } from 'react-router-dom';
import { LEGAL } from '../config/legal';
import { openCookieSettings } from '../utils/consent';

export const SiteFooter: React.FC = () => (
  <footer className="site-footer mx-auto mt-20 w-full max-w-6xl md:mt-24">
    <div className="flex flex-col items-center gap-1 sm:items-start">
      <span className="font-display text-sm font-semibold tracking-tight text-white">Дети В ТОПЕ</span>
      <span className="text-zinc-400">
        © {new Date().getFullYear()} {LEGAL.companyShort}, УНП {LEGAL.unp}
      </span>
    </div>
    <nav aria-label="Документы" className="site-footer__links">
      <Link to="/privacy">Конфиденциальность</Link>
      <Link to="/terms">Условия</Link>
      <Link to="/consent">Согласие</Link>
      <a href={LEGAL.offerUrl} target="_blank" rel="noopener noreferrer">
        Оферта
      </a>
      <button type="button" onClick={openCookieSettings}>
        Cookie
      </button>
    </nav>
  </footer>
);
