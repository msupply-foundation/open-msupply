/*
 * AC-LN19 / AC-LN20 (spec/internal-orders § S4 line editor) — a stock figure
 * is suffixed with the active mode's measure word, INFLECTED for the figure
 * ("1 pack" / "61 packs"; the spec's own example). The item's stored unit
 * name passes through as-is — an arbitrary noun can't be auto-pluralised —
 * but the generic fallbacks (pack / dose / unit) each inflect.
 */
import { describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '../../../../intl/intl';
import commonEn from '../../../../intl/locales/en/common.json';
import { modeWord } from './internalOrderLineEdit';

setDictionaries({ en: commonEn });
setLocale('en');

describe('modeWord', () => {
  it('inflects the packs word for the count', () => {
    expect(modeWord('packs', null, 1)).toBe('pack');
    expect(modeWord('packs', null, 61)).toBe('packs');
  });

  it('inflects the doses word for the count', () => {
    expect(modeWord('doses', null, 1)).toBe('dose');
    expect(modeWord('doses', null, 12)).toBe('doses');
  });

  it('inflects the generic unit fallback for the count', () => {
    expect(modeWord('units', null, 1)).toBe('unit');
    expect(modeWord('units', null, 5)).toBe('units');
  });

  it("uses the item's own unit name as stored, whatever the count", () => {
    expect(modeWord('units', 'tablet', 1)).toBe('tablet');
    expect(modeWord('units', 'tablet', 5)).toBe('tablet');
  });
});
