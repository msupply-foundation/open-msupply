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

const intervalAndBuffer = {
  supplyIntervalMonths: 3,
  safetyBufferMonths: 0.5,
  deliveryLeadTimeMonths: 0,
};

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

describe("the store's target among the options (OMS-REG-REPL-17.31)", () => {
  // Issue 2750's store.
  const store = {
    supplyIntervalMonths: 1,
    safetyBufferMonths: 0.33,
    deliveryLeadTimeMonths: 1,
  };

  it("leads with the store's target, showing what it's made of, while it's selected", () => {
    const options = targetMonthOptions(2.33, 0, store);
    expect(options.map(o => o.value)).toEqual([
      '2.33',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(options[0]).toMatchObject({
      label: '2.33 months',
      description:
        'supply interval 1 + safety buffer 0.33 + delivery lead time 1',
    });
    expect(options.slice(1).every(o => o.description == null)).toBe(true);
  });

  it("still offers the store's target once another is chosen", () => {
    const options = targetMonthOptions(3, 0, store);
    expect(options[0]?.label).toBe('2.33 months');
    expect(options.map(o => o.value)).toContain('3');
  });

  it("offers a target that is neither standard nor the store's alongside it", () => {
    const options = targetMonthOptions(7, 0, store);
    expect(options.map(o => o.value)).toEqual([
      '2.33',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
  });

  it("lists a whole-month store target once, as the store's", () => {
    const whole = { ...store, safetyBufferMonths: 1 };
    const options = targetMonthOptions(1, 0, whole);
    expect(options.map(o => o.value)).toEqual(['3', '1', '2', '4', '5', '6']);
    expect(options[0]?.description).toContain('supply interval 1');
  });

  it("keeps the order's stored value on the store's option when they match to a hundredth", () => {
    const options = targetMonthOptions(2.3, 0, {
      supplyIntervalMonths: 2.2,
      safetyBufferMonths: 0.1,
      deliveryLeadTimeMonths: 0,
    });
    // 2.2 + 0.1 is 2.3000000000000003 as a float.
    expect(options[0]?.value).toBe('2.3');
  });

  it('rounds the makeup to 2 dp, like the label', () => {
    const option = targetMonthOptions(0, 0, {
      ...store,
      safetyBufferMonths: 0.333,
    })[0];
    expect(option?.label).toBe('2.33 months');
    expect(option?.description).toBe(
      'supply interval 1 + safety buffer 0.33 + delivery lead time 1'
    );
  });

  it("disables the store's target below the reorder threshold", () => {
    expect(targetMonthOptions(3, 3, store)[0]?.disabled).toBe(true);
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

  it("offers only the store's target, first, and the order's own", () => {
    const options = fixedTargetOptions(2, 0, intervalAndBuffer);
    expect(options.map(o => o.value)).toEqual(['3.5', '2']);
    expect(options[0]?.description).toBe(
      'supply interval 3 + safety buffer 0.5'
    );
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

describe('a store with a delivery lead time (OMS-REG-REPL-17.30)', () => {
  const withLeadTime = { ...intervalAndBuffer, deliveryLeadTimeMonths: 1 };

  it('adds the lead time to the target the store sets', () => {
    expect(
      intervalAndBufferBehindTarget({
        maxMonthsOfStock: 4.5,
        supplyIntervalAndBuffer: withLeadTime,
        program: null,
      })
    ).toEqual(withLeadTime);
    expect(targetDiffersFromFixed(4.5, withLeadTime)).toBe(false);
    expect(targetDiffersFromFixed(3.5, withLeadTime)).toBe(true);
  });

  it('names the lead time in the tooltips', () => {
    expect(targetSetByStoreMessage(withLeadTime)).toContain(
      'delivery lead time of 1 months'
    );
    const message = targetDiffersFromStoreMessage(withLeadTime);
    expect(message).toContain('delivery lead time of 1 months');
    expect(message).toContain('4.5 months');
  });

  it("doesn't mention a lead time of 0", () => {
    expect(targetSetByStoreMessage(intervalAndBuffer)).not.toContain(
      'lead time'
    );
  });
});
