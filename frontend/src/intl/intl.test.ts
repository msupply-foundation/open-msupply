import { describe, expect, it } from 'vitest';
import { t, tPlural, setLocale, setDictionaries } from './intl';
import commonEn from './locales/en/common.json';
import commonAr from './locales/ar/common.json';
import commonFr from './locales/fr/common.json';
import commonFrDj from './locales/fr-DJ/common.json';

// Seed the dictionaries signal directly (the loading pipeline is tested
// separately) so we exercise the translator + plural selection
// deterministically.
setDictionaries({
  en: commonEn,
  ar: commonAr,
  fr: commonFr,
  'fr-DJ': commonFrDj,
});

describe('t', () => {
  it('translates a key in the active locale', () => {
    setLocale('en');
    expect(t('button.login')).toBe('Log in');
    setLocale('ar');
    expect(t('button.login')).toBe('تسجيل الدخول');
  });

  it('falls back to the key when missing', () => {
    setLocale('en');
    // 'language.name' exists; a made-up key returns itself.
    expect(t('does.not.exist' as never)).toBe('does.not.exist');
  });

  it('falls back to the English string for a key missing from the active locale', () => {
    // 'label.expiry-date' exists in the English catalog but not the Arabic
    // one; under Arabic it must resolve to the English string, not leak the
    // raw key (spec/i18n → translating text, AC-TR19).
    expect((commonAr as Record<string, string>)['label.expiry-date']).toBe(
      undefined
    );
    setLocale('ar');
    expect(t('label.expiry-date')).toBe(commonEn['label.expiry-date']);
  });

  it('still falls back to the raw key when absent from every locale', () => {
    // English is the base; a key missing there too stays visible as itself.
    setLocale('ar');
    expect(t('does.not.exist' as never)).toBe('does.not.exist');
  });

  it('resolves a regional variant through its base locale, then English', () => {
    // fr-DJ is a thin overlay on fr: it restates `app.login`, leaves
    // `app.loading` to French, and `button.add-line` is in neither — which then
    // resolves to English rather than the raw key (spec/i18n → translating
    // text, AC-TR20).
    setLocale('fr-DJ');
    expect(t('app.login')).toBe(commonFrDj['app.login']);
    expect(t('app.login')).not.toBe(commonFr['app.login']);
    expect((commonFrDj as Record<string, string>)['app.loading']).toBe(
      undefined
    );
    expect(t('app.loading')).toBe(commonFr['app.loading']);
    expect((commonFr as Record<string, string>)['button.add-line']).toBe(
      undefined
    );
    expect(t('button.add-line')).toBe(commonEn['button.add-line']);
  });

  it('interpolates an already-translated string into {{ tokens }}', () => {
    setLocale('en');
    // messages.confirm-status-as = "Confirm status as {{status}}?" — the
    // caller resolves the status label with t() before passing it in.
    expect(
      t('messages.confirm-status-as', { status: t('status.finalised') })
    ).toBe('Confirm status as Finalised?');
  });
});

describe('tPlural', () => {
  it('selects English one/other and interpolates count', () => {
    setLocale('en');
    expect(tPlural('error.failed-attempts', 1)).toBe('1 failed attempt');
    expect(tPlural('error.failed-attempts', 3)).toBe('3 failed attempts');
  });

  it('selects Arabic plural categories', () => {
    setLocale('ar');
    // zero / one / two are fixed strings; few interpolates the count.
    expect(tPlural('error.failed-attempts', 0)).toBe('لا محاولات فاشلة');
    expect(tPlural('error.failed-attempts', 3)).toContain('محاولات فاشلة');
  });
});
