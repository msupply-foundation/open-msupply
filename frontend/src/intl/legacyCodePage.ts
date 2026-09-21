import type { SupportedLocale } from './locales';

/*
 * The legacy Windows code page a spreadsheet on a machine set to each language
 * saves its CSVs in.
 *
 * Excel on Windows does not write UTF-8 by default — it writes the machine's
 * ANSI code page, and which one that is follows the machine's language. A file
 * from a Russian install is windows-1251, from an Arabic, Dari or Pashto
 * install windows-1256, from a Western European one windows-1252. All three
 * decode ANY byte sequence without complaint, so decoding one under another
 * does not fail: it produces plausible-looking wrong text. The only way to
 * choose right is to know the language the user is working in.
 *
 * Lao and Tetum have no legacy Windows code page (Lao is Unicode-only on
 * Windows; Tetum is Latin-script), so they take the Western European default.
 */
const LEGACY_CODE_PAGES: Record<SupportedLocale, string> = {
  ar: 'windows-1256',
  prs: 'windows-1256',
  ps: 'windows-1256',
  ru: 'windows-1251',
  en: 'windows-1252',
  es: 'windows-1252',
  fr: 'windows-1252',
  'fr-DJ': 'windows-1252',
  lo: 'windows-1252',
  pt: 'windows-1252',
  tet: 'windows-1252',
};

/** The code page a spreadsheet in this language most likely saved in. */
export const legacyCodePage = (l: SupportedLocale): string =>
  LEGACY_CODE_PAGES[l];
