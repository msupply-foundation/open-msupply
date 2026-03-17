import { calculateCurrencyValues } from './CurrencyCalculations';

describe('calculateCurrencyValues', () => {
  it('converts foreign charges to local by dividing by rate', () => {
    // Base currency: NZD, Foreign currency: USD, rate = 0.6 (0.6 USD = 1 NZD)
    // USD 100 in charges -> 100 / 0.6 = 166.67 NZD
    const result = calculateCurrencyValues({
      currencyRate: 0.6,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 0,
    });

    expect(result.chargesConvertedToLocal).toBeCloseTo(166.67, 2);
  });

  it('calculates total charges as converted A + B', () => {
    // A = USD 100, B = NZD 200, rate = 0.6
    // Total = 100/0.6 + 200 = 166.67 + 200 = 366.67
    const result = calculateCurrencyValues({
      currencyRate: 0.6,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 0,
    });

    expect(result.totalCharges).toBeCloseTo(366.67, 2);
  });

  it('converts total goods from foreign to local', () => {
    // PO total = USD 1000, rate = 0.6
    // Local = 1000 / 0.6 = 1666.67 NZD
    const result = calculateCurrencyValues({
      currencyRate: 0.6,
      chargesInForeignCurrency: 0,
      chargesInLocalCurrency: 0,
      totalGoodsForeignCurrency: 1000,
    });

    expect(result.totalGoodsLocal).toBeCloseTo(1666.67, 2);
  });

  it('calculates cost adjustment percentage', () => {
    // A = USD 100, B = NZD 200, rate = 0.6, goods = USD 1000
    // Total charges = 100/0.6 + 200 = 366.67
    // Total goods local = 1000/0.6 = 1666.67
    // % = 366.67 / 1666.67 * 100 = 22.00%
    const result = calculateCurrencyValues({
      currencyRate: 0.6,
      chargesInForeignCurrency: 100,
      chargesInLocalCurrency: 200,
      totalGoodsForeignCurrency: 1000,
    });

    expect(result.costAdjustmentPercent).toBeCloseTo(22.0, 2);
  });

  it('returns 0% cost adjustment when total goods is zero', () => {
    const result = calculateCurrencyValues({
      currencyRate: 0.6,
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

  it('handles rate greater than 1', () => {
    // Base: USD, Foreign: JPY, rate = 150 (150 JPY = 1 USD)
    // JPY 15000 charges -> 15000 / 150 = 100 USD
    const result = calculateCurrencyValues({
      currencyRate: 150,
      chargesInForeignCurrency: 15000,
      chargesInLocalCurrency: 50,
      totalGoodsForeignCurrency: 150000,
    });

    expect(result.chargesConvertedToLocal).toBe(100);
    expect(result.totalGoodsLocal).toBe(1000);
    expect(result.totalCharges).toBe(150);
    expect(result.costAdjustmentPercent).toBeCloseTo(15, 2);
  });
});
