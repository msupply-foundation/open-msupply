import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setDictionaries, setLocale } from '../../../intl/intl';
import commonEn from '../../../intl/locales/en/common.json';
import {
  fixedTargetOptions,
  intervalAndBufferBehindTarget,
  storeFixedIntervalAndBuffer,
  targetDiffersFromFixed,
  targetDiffersFromStoreMessage,
  targetMonthOptions,
  targetSetByStoreMessage,
  thresholdMonthOptions,
} from './targetMonths';

// The header's months-of-stock decisions (spec/internal-orders rules › target
// months of stock; ui-surface S3 § toolbar). Behaviours cited from
// OMS-REG-REPL-17 (Validate Internal Order Forecast Methods).

beforeAll(() => {
  setDictionaries({ en: commonEn });
  setLocale('en');
});
afterAll(() => setDictionaries({}));

const intervalAndBuffer = { supplyIntervalMonths: 3, safetyBufferMonths: 0.5 };

describe('targetMonthOptions', () => {
  it('offers 1…6 months when the target is one of them', () => {
    const options = targetMonthOptions(3, 0);
    expect(options.map(o => o.value)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(options[0]?.label).toBe('1 month');
    expect(options[2]?.label).toBe('3 months');
  });

  it("offers a fractional supply interval + safety buffer as the order's own option, in order (OMS-REG-REPL-17.16)", () => {
    const options = targetMonthOptions(3.5, 0);
    expect(options.map(o => o.value)).toEqual([
      '1',
      '2',
      '3',
      '3.5',
      '4',
      '5',
      '6',
    ]);
    expect(options.find(o => o.value === '3.5')?.label).toBe('3.5 months');
  });

  it('offers a supply interval + safety buffer beyond six months (OMS-REG-REPL-17.16)', () => {
    const options = targetMonthOptions(7, 0);
    expect(options.at(-1)).toMatchObject({ value: '7', label: '7 months' });
  });

  it('disables a target below the reorder threshold — the own option included', () => {
    const options = targetMonthOptions(3.5, 4);
    const disabled = options.filter(o => o.disabled).map(o => o.value);
    expect(disabled).toEqual(['1', '2', '3', '3.5']);
  });

  it('constrains nothing while the threshold is Not set', () => {
    expect(targetMonthOptions(2, 0).some(o => o.disabled)).toBe(false);
  });
});

describe('thresholdMonthOptions', () => {
  it('leads with Not set and disables a threshold above a fractional target', () => {
    const options = thresholdMonthOptions(3.5);
    expect(options[0]).toMatchObject({ value: '', label: 'Not set' });
    const disabled = options.filter(o => o.disabled).map(o => o.value);
    expect(disabled).toEqual(['4', '5', '6']);
  });
});

describe('storeFixedIntervalAndBuffer (OMS-REG-REPL-17.18 / .19)', () => {
  it('fixes a general order with the preference off on a store with a supply interval', () => {
    expect(
      storeFixedIntervalAndBuffer({
        canChangeTargetMonths: false,
        supplyIntervalAndBuffer: intervalAndBuffer,
        isProgram: false,
      })
    ).toEqual(intervalAndBuffer);
  });

  it('leaves the target changeable with the preference on, or unset (OMS-REG-REPL-17.19)', () => {
    for (const canChangeTargetMonths of [true, undefined])
      expect(
        storeFixedIntervalAndBuffer({
          canChangeTargetMonths,
          supplyIntervalAndBuffer: intervalAndBuffer,
          isProgram: false,
        })
      ).toBeUndefined();
  });

  it('leaves the target changeable on a store with no supply interval', () => {
    expect(
      storeFixedIntervalAndBuffer({
        canChangeTargetMonths: false,
        supplyIntervalAndBuffer: null,
        isProgram: false,
      })
    ).toBeUndefined();
  });

  it('never applies to a program order (its order type sets both thresholds)', () => {
    expect(
      storeFixedIntervalAndBuffer({
        canChangeTargetMonths: false,
        supplyIntervalAndBuffer: intervalAndBuffer,
        isProgram: true,
      })
    ).toBeUndefined();
  });

  it('names the supply interval and safety buffer in the lock tooltip', () => {
    const message = targetSetByStoreMessage(intervalAndBuffer);
    expect(message).toContain('3 months');
    expect(message).toContain('0.5 months');
  });
});

describe('intervalAndBufferBehindTarget (OMS-REG-REPL-17.17)', () => {
  it("is the store's supply interval and safety buffer when a general order's target equals their sum", () => {
    expect(
      intervalAndBufferBehindTarget({
        maxMonthsOfStock: 3.5,
        supplyIntervalAndBuffer: intervalAndBuffer,
        program: null,
      })
    ).toEqual(intervalAndBuffer);
  });

  it('is nothing once the target has moved off the supply interval + safety buffer', () => {
    expect(
      intervalAndBufferBehindTarget({
        maxMonthsOfStock: 4,
        supplyIntervalAndBuffer: intervalAndBuffer,
        program: null,
      })
    ).toBeUndefined();
  });

  it('is nothing on a store with no supply interval, or on a program order', () => {
    expect(
      intervalAndBufferBehindTarget({
        maxMonthsOfStock: 1,
        supplyIntervalAndBuffer: null,
        program: null,
      })
    ).toBeUndefined();
    expect(
      intervalAndBufferBehindTarget({
        maxMonthsOfStock: 3.5,
        supplyIntervalAndBuffer: intervalAndBuffer,
        program: { id: 'p', name: 'EPI' },
      })
    ).toBeUndefined();
  });
});

describe('a target that differs from the one the store fixes (OMS-REG-REPL-17.18)', () => {
  it('differs only when the target is not the supply interval + safety buffer', () => {
    expect(targetDiffersFromFixed(6, intervalAndBuffer)).toBe(true);
    expect(targetDiffersFromFixed(3.5, intervalAndBuffer)).toBe(false);
  });

  it("offers only the order's own target and the store's", () => {
    const options = fixedTargetOptions(6, 0, intervalAndBuffer);
    expect(options.map(o => o.value)).toEqual(['3.5', '6']);
    expect(options.every(o => !o.disabled)).toBe(true);
  });

  it("can't move below the reorder threshold", () => {
    const options = fixedTargetOptions(6, 4, intervalAndBuffer);
    expect(options.find(o => o.value === '3.5')?.disabled).toBe(true);
  });

  it('names the target it can only be changed to', () => {
    const message = targetDiffersFromStoreMessage(intervalAndBuffer);
    expect(message).toContain('3 months');
    expect(message).toContain('0.5 months');
    expect(message).toContain('3.5 months');
  });
});
