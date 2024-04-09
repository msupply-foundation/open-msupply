import { useIntlUtils } from '@common/intl';
import { TemperatureBreachNodeType } from '@common/types';
import { NumUtils } from '@common/utils';

export const parseBreachType = (
  breachType: TemperatureBreachNodeType | null
) => {
  const temperature = breachType?.split('_')[0];
  const type = breachType?.split('_')[1];

  return { temperature, type };
};

export const useFormatTemperature = () => {
  const { currentLanguage: language } = useIntlUtils();
  const numberFormat = new Intl.NumberFormat(language, {
    style: 'unit',
    unit: 'celsius',
    unitDisplay: 'short',
  });

  return (temperature: number) =>
    numberFormat.format(NumUtils.round(temperature, 2));
};
