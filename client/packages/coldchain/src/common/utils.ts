import { TemperatureBreachNodeType } from '@common/types';

export const parseBreachType = (
  breachType: TemperatureBreachNodeType | null
) => {
  const temperature = breachType?.split('_')[0];
  const type = breachType?.split('_')[1];

  return { temperature, type };
};
