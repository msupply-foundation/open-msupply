import {
  DateUtils,
  LocaleKey,
  TypedTFunction,
} from '@openmsupply-client/common';

export const getDisplayAge = (
  dob: Date,
  t: TypedTFunction<LocaleKey>
): string => {
  const age = DateUtils.age(dob);
  const { months, days } = DateUtils.ageInMonthsAndDays(dob ?? '');

  if (age >= 1) {
    return String(age);
  } else if (months >= 1) {
    const ageInMonthsAndDays =
      t('label.age-months-and', { count: months }) +
      t('label.age-days', { count: days });
    return ageInMonthsAndDays;
  } else {
    return t('label.age-days', { count: days });
  }
};
