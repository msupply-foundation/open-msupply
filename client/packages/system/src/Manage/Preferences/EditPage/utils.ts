import { LocaleKey, PreferenceKey } from '@openmsupply-client/common';
import { AdminPreferenceFragment } from '../api/operations.generated';

// Grouping of global preferences
export const PREFERENCE_GROUP_CONFIG: Partial<
  Record<LocaleKey, PreferenceKey[]>
> = {
  'title.average-monthly-consumption': [
    PreferenceKey.DaysInMonth,
    PreferenceKey.AdjustForNumberOfDaysOutOfStock,
  ],
  'label.procurement': [
    PreferenceKey.AuthoriseGoodsReceived,
    PreferenceKey.AuthorisePurchaseOrder,
  ],
  'label.expired-stock': [
    PreferenceKey.ExpiredStockPreventIssue,
    PreferenceKey.ExpiredStockIssueThreshold,
  ],
};

export const isAnyAmcPrefOn = (
  preferences: AdminPreferenceFragment[]
): boolean => {
  return preferences.some(pref => {
    switch (pref.key) {
      case PreferenceKey.AdjustForNumberOfDaysOutOfStock:
      case PreferenceKey.DaysInMonth:
        return pref.value > 0;
      default:
        return false;
    }
  });
};
