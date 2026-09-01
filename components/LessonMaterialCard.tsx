import { Download, FileText } from 'lucide-react';

type Props = {
  url: string;
  name?: string | null;
};

function displayName(name: string | null | undefined, url: string): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  try {
    const path = new URL(url).pathname.split('/').pop() || '';
    return decodeURIComponent(path) || 'Материалы к уроку';
  } catch {
    return 'Материалы к уроку';
  }
}

export function LessonMaterialCard({ url, name }: Props) {
  const label = displayName(name, url);

  return (
    <div className="rounded-[1.75rem] border border-white/[0.08] bg-[#0a0a0a] p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-white ring-1 ring-white/10">
            <FileText size={20} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
              Материалы к уроку
            </p>
            <p className="mt-1 truncate text-sm font-bold text-white sm:text-base" title={label}>
              {label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Презентация или файл — можно сохранить на телефон или компьютер.
            </p>
          </div>
        </div>
        <a
          href={url}
          download={label}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-black transition-colors hover:bg-zinc-200 sm:w-auto"
        >
          <Download size={18} aria-hidden />
          Скачать
        </a>
      </div>
    </div>
  );
}
