import { intlNumberFormat } from './IntlNumber';

// NOTE on the test environment: the bug these overrides fix is browser-only.
// In a browser, `Intl.NumberFormat('ps')` defaults to Latin digits, which is
// why Pashto needs routing through `fa-AF`. Node's full-ICU happens to render
// `ps`/`prs` with extended-Arabic digits already, so these assertions document
// the intended per-locale numbering-system policy (and guard the lookup logic /
// non-overridden locales) rather than reproducing the raw browser divergence.

const N = 1234567;

const LATIN = /[0-9]/;
const ARABIC_INDIC = /[٠-٩]/; // ٠-٩
const EXTENDED_ARABIC = /[۰-۹]/; // ۰-۹ (a.k.a. arabext / Eastern)

describe('intlNumberFormat numbering systems', () => {
  it('uses Latin digits for non-overridden locales (en)', () => {
    const out = intlNumberFormat('en').format(N);
    expect(out).toBe('1,234,567');
    expect(out).toMatch(LATIN);
  });

  it('uses Arabic-Indic digits for ar', () => {
    const out = intlNumberFormat('ar').format(N);
    expect(out).toMatch(ARABIC_INDIC);
    expect(out).not.toMatch(LATIN);
    expect(out).not.toMatch(EXTENDED_ARABIC);
  });

  it('uses extended-Arabic (Eastern) digits for Dari (prs)', () => {
    const out = intlNumberFormat('prs').format(N);
    expect(out).toMatch(EXTENDED_ARABIC);
    expect(out).not.toMatch(LATIN);
  });

  it('uses extended-Arabic (Eastern) digits for Pashto (ps)', () => {
    const out = intlNumberFormat('ps').format(N);
    expect(out).toMatch(EXTENDED_ARABIC);
    expect(out).not.toMatch(LATIN);
  });

  it('applies the override to regional variants via base-language fallback', () => {
    // i18next/the browser may resolve to a regional tag (e.g. `ps-AF`); the
    // base-language override must still apply so digits don't revert to Latin.
    expect(intlNumberFormat('ps-AF').format(N)).toBe(
      intlNumberFormat('ps').format(N)
    );
    expect(intlNumberFormat('prs-AF').format(N)).toBe(
      intlNumberFormat('prs').format(N)
    );
  });

  it('passes Intl.NumberFormat options through', () => {
    expect(intlNumberFormat('en', { minimumFractionDigits: 2 }).format(5)).toBe(
      '5.00'
    );
  });
});
