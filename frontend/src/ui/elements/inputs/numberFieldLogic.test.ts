import { describe, expect, it } from 'vitest';
import { getNumberSymbols } from '../../../intl/formatNumber';
import {
  displayString,
  finalizeText,
  isIncomplete,
  processInput,
  stepValue,
  textRepresents,
  type NumberFieldConstraints,
} from './numberFieldLogic';

// The behavioural spec of record, ported from the old OMS
// NumericTextInput.test.tsx: each processInput call is one input event over
// the whole prospective text (as fireEvent.change was); finalizeText is blur.
// Deliberate divergences from the old component are marked ⚠ inline.

const o = (
  over: Partial<NumberFieldConstraints> = {}
): NumberFieldConstraints => ({
  min: 0,
  max: 999_999_999,
  decimalLimit: 0,
  ...over,
});

describe('decimal input (decimalLimit 10)', () => {
  const dec = o({ decimalLimit: 10 });

  it('accepts a trailing decimal point without committing', () => {
    const r = processInput('1.', dec, 'en');
    expect(r).toEqual({ accepted: true, text: '1.' });
  });

  it('drops the trailing point on blur', () => {
    expect(finalizeText('1.', dec, 'en')).toEqual({ value: 1, text: '1' });
  });

  it('commits full decimals as typed', () => {
    const r = processInput('1.7001', dec, 'en');
    expect(r).toEqual({
      accepted: true,
      text: '1.7001',
      commit: { value: 1.7001 },
    });
    expect(finalizeText('1.7001', dec, 'en').text).toBe('1.7001');
  });

  it('keeps trailing zeros while typing, trims them on blur', () => {
    // ⚠ old OMS deferred the commit on a trailing zero (it rewrote the text
    // on commit, which would have eaten the zero); we never rewrite text on
    // commit, so committing the equal value is harmless.
    const r = processInput('1.700', dec, 'en');
    expect(r).toEqual({
      accepted: true,
      text: '1.700',
      commit: { value: 1.7 },
    });
    expect(finalizeText('1.700', dec, 'en').text).toBe('1.7');
  });
});

describe('sign handling', () => {
  it('strips a minus when negatives are not allowed', () => {
    const r = processInput('-1.7', o({ decimalLimit: 10 }), 'en');
    expect(r).toEqual({
      accepted: true,
      text: '1.7',
      commit: { value: 1.7 },
    });
  });

  it('rejects a lone minus when negatives are not allowed', () => {
    expect(processInput('-', o(), 'en')).toEqual({ accepted: false });
  });

  it('accepts a lone minus as incomplete when negatives are allowed', () => {
    const neg = o({ min: -999_999_999 });
    expect(processInput('-', neg, 'en')).toEqual({
      accepted: true,
      text: '-',
    });
    expect(processInput('-5', neg, 'en')).toEqual({
      accepted: true,
      text: '-5',
      commit: { value: -5 },
    });
    expect(finalizeText('-5', neg, 'en')).toEqual({ value: -5, text: '-5' });
  });

  it('walks the negative-decimal entry states, padding on blur', () => {
    const c = o({ min: -999_999_999, decimalLimit: 3, decimalMin: 2 });
    expect(processInput('-0', c, 'en')).toEqual({
      accepted: true,
      text: '-0',
      commit: { value: 0 }, // -0 squashed
    });
    expect(processInput('-0.', c, 'en')).toEqual({
      accepted: true,
      text: '-0.',
    });
    expect(processInput('-0.2', c, 'en')).toEqual({
      accepted: true,
      text: '-0.2',
      commit: { value: -0.2 },
    });
    expect(finalizeText('-0.2', c, 'en')).toEqual({
      value: -0.2,
      text: '-0.20',
    });
  });
});

describe('decimal padding (decimalMin)', () => {
  const c = o({ decimalLimit: 10, decimalMin: 2 });

  it('pads on blur', () => {
    expect(finalizeText('1', c, 'en').text).toBe('1.00');
    expect(finalizeText('1.', c, 'en').text).toBe('1.00');
    expect(finalizeText('1.1', c, 'en').text).toBe('1.10');
    expect(finalizeText('1.123', c, 'en').text).toBe('1.123');
  });

  it('handles decimalLimit < decimalMin', () => {
    const tight = o({ decimalLimit: 1, decimalMin: 3 });
    // Typing past the limit is repaired by rounding…
    expect(processInput('1.11', tight, 'en')).toEqual({
      accepted: true,
      text: '1.1',
      commit: { value: 1.1 },
    });
    // …and the blur display still pads to decimalMin.
    expect(finalizeText('1.1', tight, 'en').text).toBe('1.100');
  });
});

describe('clearing', () => {
  it('commits undefined immediately when emptied', () => {
    expect(processInput('', o(), 'en')).toEqual({
      accepted: true,
      text: '',
      commit: { value: undefined },
    });
  });

  it('finalizes unparseable text as cleared', () => {
    expect(finalizeText('', o(), 'en')).toEqual({ value: undefined, text: '' });
    expect(finalizeText('-', o({ min: -10 }), 'en')).toEqual({
      value: undefined,
      text: '',
    });
  });
});

describe('grouping', () => {
  it('⚠ does NOT group while typing (old OMS did, and the caret jumped)', () => {
    expect(processInput('1000', o(), 'en')).toEqual({
      accepted: true,
      text: '1000',
      commit: { value: 1000 },
    });
  });

  it('groups on blur', () => {
    expect(finalizeText('1000', o(), 'en')).toEqual({
      value: 1000,
      text: '1,000',
    });
  });

  it('does not group with noFormatting', () => {
    expect(finalizeText('1000', o({ noFormatting: true }), 'en').text).toBe(
      '1000'
    );
  });

  it('accepts pasted grouped text', () => {
    expect(processInput('1,234', o(), 'en')).toEqual({
      accepted: true,
      text: '1234',
      commit: { value: 1234 },
    });
  });
});

describe('gate and repair', () => {
  it('repairs a paste with junk and over-precision', () => {
    expect(processInput('$1,234.567', o({ decimalLimit: 2 }), 'en')).toEqual({
      accepted: true,
      text: '1234.57',
      commit: { value: 1234.57 },
    });
  });

  it('rounds a decimal pasted into an integer field', () => {
    // ⚠ old OMS deleted the "." and read "1.5" as 15.
    expect(processInput('1.5', o(), 'en')).toEqual({
      accepted: true,
      text: '2',
      commit: { value: 2 },
    });
  });

  it('ignores a typed decimal point in an integer field', () => {
    expect(processInput('1.', o(), 'en')).toEqual({
      accepted: true,
      text: '1',
      commit: { value: 1 },
    });
  });

  it('drops a letter typed into a number', () => {
    expect(processInput('12a', o(), 'en')).toEqual({
      accepted: true,
      text: '12',
      commit: { value: 12 },
    });
  });

  it('rejects unrepairable input', () => {
    expect(processInput('abc', o(), 'en')).toEqual({ accepted: false });
    expect(processInput('1.2.3', o({ decimalLimit: 2 }), 'en')).toEqual({
      accepted: false,
    });
  });
});

describe('leading zeros', () => {
  it('keeps them in the text while typing, commits the number', () => {
    expect(processInput('000564', o(), 'en')).toEqual({
      accepted: true,
      text: '000564',
      commit: { value: 564 },
    });
  });

  it('collapses them on blur — a NumberField value is a number; digit strings that keep zeros (codes) are TextField territory', () => {
    expect(finalizeText('000564', o(), 'en')).toEqual({
      value: 564,
      text: '564',
    });
    expect(finalizeText('000564', o({ noFormatting: true }), 'en')).toEqual({
      value: 564,
      text: '564',
    });
  });
});

describe('clamping (commit-only while typing; text on blur)', () => {
  const c = o({ min: 10, max: 100 });

  it('clamps the committed value but never the text mid-typing', () => {
    expect(processInput('5', c, 'en')).toEqual({
      accepted: true,
      text: '5',
      commit: { value: 10 },
    });
    expect(processInput('50', c, 'en')).toEqual({
      accepted: true,
      text: '50',
      commit: { value: 50 },
    });
    expect(processInput('500', c, 'en')).toEqual({
      accepted: true,
      text: '500',
      commit: { value: 100 },
    });
  });

  it('clamps the text on blur', () => {
    expect(finalizeText('5', c, 'en')).toEqual({ value: 10, text: '10' });
    expect(finalizeText('500', c, 'en')).toEqual({ value: 100, text: '100' });
  });
});

describe('stepping', () => {
  it('steps from 0 (or min) when empty', () => {
    expect(stepValue(undefined, 1, o())).toBe(1);
    expect(stepValue(undefined, -1, o({ min: -10 }))).toBe(-1);
    expect(stepValue(undefined, 1, o({ min: 5 }))).toBe(6);
  });

  it('clamps at the bounds', () => {
    expect(stepValue(9, 10, o({ max: 15 }))).toBe(15);
    expect(stepValue(0, -1, o())).toBe(0);
  });

  it('avoids float noise at the decimal limit', () => {
    expect(stepValue(0.1, 0.2, o({ decimalLimit: 1 }))).toBe(0.3);
  });
});

describe('locales', () => {
  it('fr: comma decimal, aliased numpad dot, spaced grouping', () => {
    const c = o({ decimalLimit: 1 });
    expect(processInput('1234,5', c, 'fr')).toEqual({
      accepted: true,
      text: '1234,5',
      commit: { value: 1234.5 },
    });
    // Numpads emit "." in every locale.
    expect(processInput('1,5', c, 'fr')).toEqual({
      accepted: true,
      text: '1,5',
      commit: { value: 1.5 },
    });
    expect(processInput('1.5', c, 'fr')).toEqual({
      accepted: true,
      text: '1,5',
      commit: { value: 1.5 },
    });
    // Pasted display-formatted text (group = a space character in fr).
    const grouped = displayString(1234.5, c, 'fr');
    expect(processInput(grouped, c, 'fr')).toEqual({
      accepted: true,
      text: '1234,5',
      commit: { value: 1234.5 },
    });
  });

  it('ar: Arabic-Indic digits gate and parse', () => {
    expect(processInput('١٢٣', o(), 'ar')).toEqual({
      accepted: true,
      text: '١٢٣',
      commit: { value: 123 },
    });
    const { decimal } = getNumberSymbols('ar');
    const r = processInput(`١٢${decimal}٥`, o({ decimalLimit: 1 }), 'ar');
    expect(r.accepted && r.commit?.value).toBe(12.5);
  });
});

describe('sync guards', () => {
  it('textRepresents matches formatted and plain text to the value', () => {
    expect(textRepresents('1,000', 1000, 'en')).toBe(true);
    expect(textRepresents('1000', 1000, 'en')).toBe(true);
    expect(textRepresents('', undefined, 'en')).toBe(true);
    expect(textRepresents('5', 10, 'en')).toBe(false);
    expect(textRepresents('', 0, 'en')).toBe(false);
  });

  it('isIncomplete flags entry states only', () => {
    expect(isIncomplete('-', 'en')).toBe(true);
    expect(isIncomplete('1.', 'en')).toBe(true);
    expect(isIncomplete('5', 'en')).toBe(false);
    expect(isIncomplete('', 'en')).toBe(false);
  });
});
