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
  'label.procurement': [PreferenceKey.AuthorisePurchaseOrder],
  'label.expired-stock': [
    PreferenceKey.ExpiredStockPreventIssue,
    PreferenceKey.ExpiredStockIssueThreshold,
  ],
  'label.backdating': [PreferenceKey.Backdating],
  'label.pricing': [
    PreferenceKey.ItemMarginOverridesSupplierMargin,
    PreferenceKey.TransferStockToInternalCustomersAtCostPrice,
  ],
};

// Set only in the new front end (#2188): they change nothing but its Simple
// dispensing screen, which this UI doesn't have. The server lists them, so
// they're left out here rather than shown with no labels.
const NEW_FRONT_END_ONLY: PreferenceKey[] = [
  PreferenceKey.DispensingScreen,
  PreferenceKey.UseUnnamedPatient,
  PreferenceKey.StartWithUnnamedPatient,
  PreferenceKey.AskForPatientType,
];

export const withoutNewFrontEndOnly = <T extends { key: PreferenceKey }>(
  preferences: T[]
): T[] => preferences.filter(pref => !NEW_FRONT_END_ONLY.includes(pref.key));

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
