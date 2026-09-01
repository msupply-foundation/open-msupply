import { describe, expect, it } from 'vitest';
import { LOCALE_META, SUPPORTED_LOCALES } from './locales';
import { languageOptions } from './intlUtils';

// The catalogs actually shipped, discovered from the filesystem rather than
// restated here — the whole point is to catch a catalog and the supported set
// drifting apart (issue #850: seven shipped languages the selector never
// offered).
const shipped = Object.keys(import.meta.glob('./locales/*/common.json')).map(
  path => path.split('/')[2]
);

describe('supported locales', () => {
  it('offers every shipped catalog', () => {
    expect([...SUPPORTED_LOCALES].sort()).toEqual([...shipped].sort());
  });

  it('has metadata for every locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const meta = LOCALE_META[locale];
      expect(meta).toBeDefined();
      expect(['ltr', 'rtl']).toContain(meta.dir);
      // The number locale must be a tag Intl actually accepts — a typo here
      // throws deep inside formatNumber at runtime instead.
      expect(() => new Intl.NumberFormat(meta.numberLocale)).not.toThrow();
    }
  });

  it('points every base locale at another supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const base = LOCALE_META[locale].base;
      if (base === undefined) continue;
      expect(SUPPORTED_LOCALES).toContain(base);
      expect(base).not.toBe(locale);
      // One level only: activeDict merges the base's catalog, not the base's
      // own base.
      expect(LOCALE_META[base].base).toBeUndefined();
    }
  });
});

describe('languageOptions', () => {
  it('labels every supported locale, distinctly', () => {
    expect(languageOptions.map(o => o.value)).toEqual([...SUPPORTED_LOCALES]);
    const labels = languageOptions.map(o => o.label);
    expect(labels.every(label => label.length > 0)).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
