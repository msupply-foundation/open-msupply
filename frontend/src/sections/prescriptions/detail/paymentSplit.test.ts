/*
 * OMS-REG-DIS-04.28 — the covered amount derives from the chosen policy's
 * discount percentage. These cover only the arithmetic half; the offered-policy
 * filter (active + unexpired) lives in PaymentsModal and is exercised in the
 * e2e suite.
 *
 * The rounding assertions exist because the plugin payment slot settles cash
 * against `paidByPatient` (spec/plugins/sdk-contract.md §
 * PrescriptionPaymentDto): an unrounded remainder is unsettleable, so the
 * rounding IS the behaviour.
 */
import { describe, expect, it } from 'vitest';
import { roundTo } from '../../../intl';
import { paymentSplit } from './paymentSplit';

describe('roundTo', () => {
  it('rounds to the given number of places', () => {
    expect(roundTo(66.666666, 2)).toBe(66.67);
    expect(roundTo(66.664, 2)).toBe(66.66);
  });

  it('rounds to whole units for a zero-decimal currency', () => {
    expect(roundTo(1234.56, 0)).toBe(1235);
  });

  it('rounds half away from zero', () => {
    expect(roundTo(0.125, 2)).toBe(0.13);
  });

  it('leaves an already-exact value alone', () => {
    expect(roundTo(10, 2)).toBe(10);
  });

  it('clears binary-float noise from a money subtraction', () => {
    // 2 - 1.56 is 0.43999999999999995 in binary floats; a stored or compared
    // money figure must not carry that.
    expect(roundTo(2 - 1.56, 2)).toBe(0.44);
  });
});

describe('OMS-REG-DIS-04.28 — payment split', () => {
  it('leaves the whole total with the patient when no policy is chosen', () => {
    expect(paymentSplit(100, undefined, 2)).toEqual({
      total: 100,
      paidByInsurance: 0,
      paidByPatient: 100,
    });
  });

  it('leaves the whole total with the patient at a zero discount', () => {
    expect(paymentSplit(100, 0, 2)).toEqual({
      total: 100,
      paidByInsurance: 0,
      paidByPatient: 100,
    });
  });

  it('splits by the policy discount percentage', () => {
    expect(paymentSplit(200, 25, 2)).toEqual({
      total: 200,
      paidByInsurance: 50,
      paidByPatient: 150,
    });
  });

  it('leaves a settleable patient share for a repeating fraction', () => {
    // 33⅓% of 100 is 33.3333…: both sides must land on 2dp, and they must
    // still sum to the total — otherwise a payment form can never balance.
    const split = paymentSplit(100, 33.3333, 2);
    expect(split.paidByInsurance).toBe(33.33);
    expect(split.paidByPatient).toBe(66.67);
    expect(split.paidByInsurance + split.paidByPatient).toBe(100);
  });

  it('covers the whole total at a 100% discount', () => {
    expect(paymentSplit(75.5, 100, 2)).toEqual({
      total: 75.5,
      paidByInsurance: 75.5,
      paidByPatient: 0,
    });
  });

  it('rounds both shares to whole units for a zero-decimal currency', () => {
    const split = paymentSplit(1000, 33.3333, 0);
    expect(split.paidByInsurance).toBe(333);
    expect(split.paidByPatient).toBe(667);
  });

  it('rounds an invoice total that arrives as a float sum', () => {
    // Real invoice totals come back like this (a 1.80 charge as three lines).
    expect(paymentSplit(1.7999999999999998, undefined, 2).total).toBe(1.8);
  });

  it('always sums back to the total', () => {
    // The split's documented arithmetic, across the cases most likely to break
    // it: repeating fractions, float-sum totals, and 0-decimal currencies.
    const cases: [number, number | undefined, number][] = [
      [100, 33.3333, 2],
      [1.7999999999999998, 50, 2],
      [30.299999999999997, 12.5, 2],
      [1000, 33.3333, 0],
      [0.05, 50, 2],
      [999.995, 7, 2],
    ];
    for (const [total, percentage, decimals] of cases) {
      const split = paymentSplit(total, percentage, decimals);
      expect(split.paidByInsurance + split.paidByPatient).toBe(split.total);
    }
  });
});
