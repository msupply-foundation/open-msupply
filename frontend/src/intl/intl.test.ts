import { describe, expect, it } from 'vitest';
import { t, tPlural, setLocale, setDictionaries } from './intl';
import commonEn from './locales/en/common.json';
import commonAr from './locales/ar/common.json';

// Seed the dictionaries signal directly (the loading pipeline is tested
// separately) so we exercise the translator + plural selection
// deterministically.
setDictionaries({ en: commonEn, ar: commonAr });

describe('t', () => {
  it('translates a key in the active locale', () => {
    setLocale('en');
    expect(t('login.title')).toBe('Log in');
    setLocale('ar');
    expect(t('login.title')).toBe('تسجيل الدخول');
  });

  it('falls back to the key when missing', () => {
    setLocale('en');
    // 'language.name' exists; a made-up key returns itself.
    expect(t('does.not.exist' as never)).toBe('does.not.exist');
  });
});

describe('tPlural', () => {
  it('selects English one/other and interpolates count', () => {
    setLocale('en');
    expect(tPlural('login.failed-attempts', 1)).toBe('1 failed attempt');
    expect(tPlural('login.failed-attempts', 3)).toBe('3 failed attempts');
  });

  it('selects Arabic plural categories', () => {
    setLocale('ar');
    // zero / one / two are fixed strings; few interpolates the count.
    expect(tPlural('login.failed-attempts', 0)).toBe('لا محاولات فاشلة');
    expect(tPlural('login.failed-attempts', 3)).toContain('محاولات فاشلة');
  });
});
