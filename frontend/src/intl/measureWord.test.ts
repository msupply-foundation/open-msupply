/*
 * AC-LN19 / AC-LN20 (spec/internal-orders § S4 line editor) — a stock figure
 * is suffixed with the active mode's measure word, INFLECTED for the figure
 * ("1 pack" / "61 packs"; the spec's own example). The item's stored unit name
 * inflects too (English only), as do the generic fallbacks.
 */
import { describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from './intl';
import commonEn from './locales/en/common.json';
import commonFr from './locales/fr/common.json';
import { measureWord } from './measureWord';

setDictionaries({ en: commonEn, fr: commonFr });
setLocale('en');

describe('measureWord', () => {
  it('inflects the packs word for the count', () => {
    expect(measureWord('packs', null, 1)).toBe('pack');
    expect(measureWord('packs', null, 61)).toBe('packs');
  });

  it('inflects the doses word for the count', () => {
    expect(measureWord('doses', null, 1)).toBe('dose');
    expect(measureWord('doses', null, 12)).toBe('doses');
  });

  it('inflects the generic unit fallback for the count', () => {
    expect(measureWord('units', null, 1)).toBe('unit');
    expect(measureWord('units', null, 5)).toBe('units');
  });

  it("inflects the item's own unit name for the count", () => {
    expect(measureWord('units', 'tablet', 1)).toBe('tablet');
    expect(measureWord('units', 'tablet', 5)).toBe('tablets');
    expect(measureWord('units', 'box', 3)).toBe('boxes');
  });

  it('localises the fallback rather than inflecting an English word', () => {
    setLocale('fr');
    expect(measureWord('units', null, 1)).toBe(
      commonFr['label.units-plural_one']
    );
    expect(measureWord('units', null, 5)).toBe(
      commonFr['label.units-plural_other']
    );
    setLocale('en');
  });
});
