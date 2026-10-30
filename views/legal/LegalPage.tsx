import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL } from '../../config/legal';

export interface LegalSection {
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  sections: LegalSection[];
  documentTitle: string;
}

/** Общая раскладка юридических документов: заголовок, оглавление, нумерованные разделы. */
export const LegalPage: React.FC<LegalPageProps> = ({ eyebrow, title, lead, sections, documentTitle }) => {
  useEffect(() => {
    const prev = document.title;
    document.title = `${documentTitle} — Дети В ТОПЕ`;
    // canonical в index.html указывает на главную — для документа ставим собственный адрес
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonical?.href;
    if (canonical) canonical.href = `${LEGAL.site}${window.location.pathname}`;
    window.scrollTo(0, 0);
    return () => {
      document.title = prev;
      if (canonical && prevCanonical) canonical.href = prevCanonical;
    };
  }, [documentTitle]);

  return (
    <article className="legal-doc mx-auto w-full max-w-3xl px-1 pb-10 pt-6 sm:px-4 md:pt-10">
      <Link
        to="/"
        className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        На главную
      </Link>

      <header className="mb-10">
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className="page-title font-display text-3xl font-semibold tracking-[-0.035em] md:text-5xl">{title}</h1>
        <p className="mt-4 text-sm text-zinc-400">Редакция от {LEGAL.revision}</p>
        <div className="mt-6 text-base leading-relaxed text-zinc-300">{lead}</div>
      </header>

      <nav aria-label="Содержание" className="card-premium mb-12 rounded-3xl border border-white/[0.08] p-6">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Содержание</p>
        <ol className="grid gap-1.5 text-sm text-zinc-300 sm:grid-cols-2">
          {sections.map((s, i) => (
            <li key={s.title}>
              <a href={`#section-${i + 1}`} className="transition-colors hover:text-white">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-12">
        {sections.map((s, i) => (
          <section key={s.title} id={`section-${i + 1}`} className="scroll-mt-28">
            <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-white md:text-2xl">
              {i + 1}. {s.title}
            </h2>
            <div className="legal-doc__body space-y-3 text-[15px] leading-relaxed text-zinc-300">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  );
};
