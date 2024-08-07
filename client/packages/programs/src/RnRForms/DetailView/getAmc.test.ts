import { getAmc } from './getAmc';

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
