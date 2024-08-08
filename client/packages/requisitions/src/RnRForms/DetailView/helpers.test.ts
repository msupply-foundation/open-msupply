import { getAlarmLevel, getAmc } from './helpers';

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

describe('getAlarmLevel', () => {
  it('returns !! when final balance less than a quarter of max quantity', () => {
    const finalBalance = 45;
    const maximumQuantity = 200;

    const result = getAlarmLevel(finalBalance, maximumQuantity);

    expect(result).toBe('!!');
  });

  it('returns ! when final balance less than half of max quantity', () => {
    const finalBalance = 99;
    const maximumQuantity = 200;

    const result = getAlarmLevel(finalBalance, maximumQuantity);

    expect(result).toBe('!');
  });

  it('returns undefined when final balance is more than half of max quantity', () => {
    const finalBalance = 150;
    const maximumQuantity = 200;

    const result = getAlarmLevel(finalBalance, maximumQuantity);

    expect(result).toBeUndefined();
  });
});
