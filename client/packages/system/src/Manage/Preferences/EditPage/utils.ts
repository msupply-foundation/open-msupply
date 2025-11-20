import {
  LocaleKey,
  PreferenceKey,
  TypedTFunction,
} from '@openmsupply-client/common';
import { AdminPreferenceFragment } from '../api/operations.generated';

// Grouping of global preferences
export const PREFERENCE_GROUP_CONFIG: Record<string, PreferenceKey[]> = {
  'title.average-monthly-consumption': [
    PreferenceKey.UseDaysInMonth,
    PreferenceKey.DaysInMonth,
    PreferenceKey.AdjustForNumberOfDaysOutOfStock,
    PreferenceKey.ExcludeTransfers,
  ],
  'label.procurement': [
    PreferenceKey.AuthoriseGoodsReceived,
    PreferenceKey.AuthorisePurchaseOrder,
  ],
};

export const isAnyAmcPrefOn = (
  preferences: AdminPreferenceFragment[]
): boolean => {
  return preferences.some(pref => {
    switch (pref.key) {
      case PreferenceKey.UseDaysInMonth:
      case PreferenceKey.AdjustForNumberOfDaysOutOfStock:
      case PreferenceKey.ExcludeTransfers:
        return pref.value === true;
      case PreferenceKey.DaysInMonth:
        return pref.value > 0;
      default:
        return false;
    }
  });
};

export const generateAmcFormula = (
  preferences: AdminPreferenceFragment[],
  t: TypedTFunction<LocaleKey>
): string => {
  const hasTransfers = preferences.some(
    p => p.key === PreferenceKey.ExcludeTransfers && p.value
  );
  const hasDaysOut = preferences.some(
    p => p.key === PreferenceKey.AdjustForNumberOfDaysOutOfStock && p.value
  );

  const consumption = hasTransfers
    ? `(${t('label.consumption')} - ${t('label.transfers')})`
    : t('label.consumption');

  const days = hasDaysOut
    ? `(${t('label.lookback-days')} - ${t('label.days-out-of-stock')})`
    : t('label.lookback-days');

  return (
    `(${consumption} / ${t('label.lookback-months')}) * ${t('label.lookback-days')} / ${days}\n` +
    `${t('label.lookback-days')} = ${t('label.days-in-month')} * ${t('label.lookback-months')}`
  );
};
