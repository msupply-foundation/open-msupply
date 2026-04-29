import { calculateCurrencyValues } from './CurrencyCalculations';

describe('calculateCurrencyValues', () => {
  // Rate convention: home (local) currency units per 1 foreign currency unit
  // e.g. rate = 1.33 means 1 EUR = 1.33 AUD (home)
  // Foreign → Local: multiply by rate
  // Local → Foreign: divide by rate

  it('converts foreign charges to local by multiplying by rate', () => {
    // Home: AUD, Foreign: EUR, rate = 1.33 (1 EUR = 1.33 AUD)
    // EUR 100 in charges -> 100 * 1.33 = 133 AUD
    const result = calculateCurrencyValues({
      currencyRate: 1.33,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 0,
    });

    expect(result.chargesConvertedToLocal).toBeCloseTo(133, 2);
  });

  it('calculates total charges as converted A + B', () => {
    // A = EUR 100, B = AUD 200, rate = 1.33
    // Total = 100 * 1.33 + 200 = 133 + 200 = 333
    const result = calculateCurrencyValues({
      currencyRate: 1.33,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 0,
    });

    expect(result.totalCharges).toBeCloseTo(333, 2);
  });

  it('converts total goods from foreign to local', () => {
    // PO total = EUR 1000, rate = 1.33
    // Local = 1000 * 1.33 = 1330 AUD
    const result = calculateCurrencyValues({
      currencyRate: 1.33,
      chargesInForeignCurrency: 0,
      chargesInLocalCurrency: 0,
      totalGoodsForeignCurrency: 1000,
    });

    expect(result.totalGoodsLocal).toBeCloseTo(1330, 2);
  });

  it('calculates cost adjustment percentage', () => {
    // A = EUR 100, B = AUD 200, rate = 1.33, goods = EUR 1000
    // Total charges = 100 * 1.33 + 200 = 333
    // Total goods local = 1000 * 1.33 = 1330
    // % = 333 / 1330 * 100 = 25.04%
    const result = calculateCurrencyValues({
      currencyRate: 1.33,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 1000,
    });

    expect(result.costAdjustmentPercent).toBeCloseTo(25.04, 1);
  });

  it('returns 0% cost adjustment when total goods is zero', () => {
    const result = calculateCurrencyValues({
      currencyRate: 1.33,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 0,
    });

    expect(result.costAdjustmentPercent).toBe(0);
  });

  it('handles rate of 1 (same currency)', () => {
    const result = calculateCurrencyValues({
      currencyRate: 1,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 1000,
    });

    expect(result.chargesConvertedToLocal).toBe(100);
    expect(result.totalGoodsLocal).toBe(1000);
    expect(result.totalCharges).toBe(300);
    expect(result.costAdjustmentPercent).toBeCloseTo(30, 2);
  });

  it('handles rate of 0 by treating as 1', () => {
    const result = calculateCurrencyValues({
      currencyRate: 0,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 1000,
    });

    expect(result.chargesConvertedToLocal).toBe(100);
    expect(result.totalGoodsLocal).toBe(1000);
  });

  it('handles rate less than 1', () => {
    // Home: USD, Foreign: GBP, rate = 0.75 (1 GBP = 0.75 USD... unusual but valid)
    // GBP 1000 charges -> 1000 * 0.75 = 750 USD
    const result = calculateCurrencyValues({
      currencyRate: 0.75,
      chargesInForeignCurrency: 1000,
      chargesInLocalCurrency: 50,
      totalGoodsForeignCurrency: 10000,
    });

    expect(result.chargesConvertedToLocal).toBe(750);
    expect(result.totalGoodsLocal).toBe(7500);
    expect(result.totalCharges).toBe(800);
    expect(result.costAdjustmentPercent).toBeCloseTo(10.67, 2);
  });
});
