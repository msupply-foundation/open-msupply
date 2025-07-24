import { LowStockStatus } from '@common/types';
import { getLowStockStatus, getAmc, isLineError } from './helpers';

describe('getAmc', () => {
  it('should return the average monthly consumption', () => {
    const previousMonthlyConsumptionValues = '130,200';
    const adjustedQuantityConsumed = 120;
    const periodLength = 30;

    const result = getAmc(
      previousMonthlyConsumptionValues,
      adjustedQuantityConsumed,
      periodLength
    );

    expect(result).toBe(150);
  });
});

describe('getLowStockStatus', () => {
  it('returns !! when final balance less than a quarter of max quantity', () => {
    const finalBalance = 45;
    const maximumQuantity = 200;

    const result = getLowStockStatus(finalBalance, maximumQuantity);

    expect(result).toBe(LowStockStatus.BelowQuarter);
  });

  it('returns ! when final balance less than half of max quantity', () => {
    const finalBalance = 99;
    const maximumQuantity = 200;

    const result = getLowStockStatus(finalBalance, maximumQuantity);

    expect(result).toBe(LowStockStatus.BelowHalf);
  });

  it('returns undefined when final balance is more than half of max quantity', () => {
    const finalBalance = 150;
    const maximumQuantity = 200;

    const result = getLowStockStatus(finalBalance, maximumQuantity);

    expect(result).toBe(LowStockStatus.Ok);
  });
});

describe('isLineError', () => {
  it('returns true if initial balance is less than 0', () => {
    const line = { initialBalance: -1, finalBalance: 10 };
    expect(isLineError(line)).toBe(true);
  });

  it('returns true if final balance is less than 0', () => {
    const line = { initialBalance: 10, finalBalance: -1 };
    expect(isLineError(line)).toBe(true);
  });

  it('returns false if both balances are non-negative', () => {
    const line = { initialBalance: 10, finalBalance: 20 };
    expect(isLineError(line)).toBe(false);
  });

  it('returns false when balances are undefined', () => {
    const line = { initialBalance: undefined, finalBalance: undefined };
    expect(isLineError(line)).toBe(false);
  });
});
