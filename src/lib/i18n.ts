export type Lang = 'en' | 'ko';
export type Text = string | { en?: string; ko?: string } | undefined | null;
export type TextList = string[] | { en?: string[]; ko?: string[] };

/** Pick the string for the current language (falls back to the other one). */
export const tr = (v: Text, lang: Lang): string =>
  v == null ? '' : typeof v === 'string' ? v : (v[lang] ?? v.en ?? v.ko ?? '');

export const trList = (v: TextList, lang: Lang): string[] =>
  Array.isArray(v) ? v : (v[lang] ?? v.en ?? v.ko ?? []);

/** "2026-09" → "2026.09"; empty → in-progress label */
export const fmtDate = (d: string | undefined, lang: Lang) =>
  d ? d.replaceAll('-', '.') : lang === 'ko' ? '진행 중' : 'In progress';

/** Newest first; undated items go last. */
export const byDate = <T extends { date?: string }>(a: T, b: T) =>
  (b.date || '0000').localeCompare(a.date || '0000');

/** Language-neutral path ('/research/') → localized URL. */
export const href = (lang: Lang, path: string) => (lang === 'ko' ? `/ko${path}` : path);

export const NAV = [
  { key: 'research', path: '/research/', label: { en: 'Research', ko: '연구' } },
  { key: 'publications', path: '/publications/', label: { en: 'Publications', ko: '논문·특허' } },
  { key: 'people', path: '/people/', label: { en: 'People', ko: '사람' } },
  { key: 'news', path: '/news/', label: { en: 'News', ko: '소식' } },
  { key: 'contact', path: '/contact/', label: { en: 'Contact', ko: '연락' } },
] as const;

export const PUB_TYPE: Record<string, { en: string; ko: string }> = {
  journal: { en: 'JOURNAL', ko: '학술지' },
  conference: { en: 'CONFERENCE', ko: '학술대회' },
  working: { en: 'WORKING PAPER', ko: '워킹 페이퍼' },
};

export const PROJECT_TAG: Record<string, { en: string; ko: string }> = {
  ai: { en: 'AI AGENT', ko: 'AI 에이전트' },
  platform: { en: 'PLATFORM', ko: '플랫폼' },
  consulting: { en: 'CONSULTING', ko: '컨설팅' },
};
