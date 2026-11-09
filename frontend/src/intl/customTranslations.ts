import { CUSTOM_TRANSLATIONS_URL } from '../config';
import type { FlatDict, SupportedLocale } from './locales';

// Live translations from the server, overriding the bundled catalog. The server
// returns a flat key→value map for the requested language. Never throws —
// failures (offline, older server, non-JSON) resolve to an empty map so the
// bundled catalog stands on its own.
export const fetchCustomTranslations = async (
  locale: SupportedLocale
): Promise<FlatDict> => {
  try {
    const response = await fetch(
      `${CUSTOM_TRANSLATIONS_URL}?lng=${encodeURIComponent(locale)}`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) return {};
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object') return {};
    // Trust only string values; drop anything else defensively.
    const out: FlatDict = {};
    for (const [key, value] of Object.entries(
      body as Record<string, unknown>
    )) {
      if (typeof value === 'string') out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
};
