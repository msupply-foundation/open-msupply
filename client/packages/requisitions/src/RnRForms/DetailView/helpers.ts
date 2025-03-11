import { LowStockStatus } from '@common/types';
import { DAYS_IN_A_MONTH } from '@common/utils';

export const getAmc = (
  previousMonthlyConsumptionValues: string,
  adjustedQuantityConsumed: number,
  periodLength: number
) => {
  const previousConsumptionValues = previousMonthlyConsumptionValues
    .split(',')
    .filter(v => v !== '');

  const monthlyConsumptionThisPeriod =
    adjustedQuantityConsumed / (periodLength / DAYS_IN_A_MONTH);

  const totalMonthlyConsumption =
    previousConsumptionValues.reduce((acc, cur) => acc + Number(cur), 0) +
    monthlyConsumptionThisPeriod;

  const averageMonthlyConsumption =
    totalMonthlyConsumption / (previousConsumptionValues.length + 1);

  return averageMonthlyConsumption;
};

export const getLowStockStatus = (
  finalBalance: number,
  maximumQuantity: number
) => {
  if (finalBalance < maximumQuantity / 4) {
    return LowStockStatus.BelowQuarter;
  }

  if (finalBalance < maximumQuantity / 2) {
    return LowStockStatus.BelowHalf;
  }

  return LowStockStatus.Ok;
};
