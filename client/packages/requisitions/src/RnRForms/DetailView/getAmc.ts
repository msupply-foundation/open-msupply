export const getAmc = (
  previousMonthlyConsumptionValues: string,
  adjustedQuantityConsumed: number,
  periodLength: number
) => {
  const previousConsumptionValues = previousMonthlyConsumptionValues
    .split(',')
    .filter(v => v !== '');

  const monthlyConsumptionThisPeriod =
    adjustedQuantityConsumed / (periodLength / 30); // 30 days in a month

  const totalMonthlyConsumption =
    previousConsumptionValues.reduce((acc, cur) => acc + Number(cur), 0) +
    monthlyConsumptionThisPeriod;

  const averageMonthlyConsumption =
    totalMonthlyConsumption / (previousConsumptionValues.length + 1);

  return averageMonthlyConsumption;
};
