import { useIntlUtils } from '@common/intl';
import { TemperatureBreachNodeType } from '@common/types';

export const parseBreachType = (
  breachType: TemperatureBreachNodeType | null
) => {
  const temperature = breachType?.split('_')[0];
  const type = breachType?.split('_')[1];

  return { temperature, type };
};

export const useFormatTemperature = (temperature: number) => {
  const { currentLanguage: language } = useIntlUtils();
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit: 'celsius',
    unitDisplay: 'short',
  }).format(temperature);
};
