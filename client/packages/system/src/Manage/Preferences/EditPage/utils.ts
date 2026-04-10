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
  'label.backdating': [
    PreferenceKey.AllowBackdatingOfShipments,
    PreferenceKey.MaximumBackdatingDays,
  ],
};

// Map of preferences that depend on another preference being truthy to be editable (no server side validation, just a UI hint)
const PREFERENCE_DEPENDENCIES: Partial<Record<PreferenceKey, PreferenceKey>> = {
  [PreferenceKey.MaximumBackdatingDays]:
    PreferenceKey.AllowBackdatingOfShipments,
};

export const isPreferenceDisabledByDependency = (
  key: PreferenceKey,
  preferences: AdminPreferenceFragment[]
): boolean => {
  const dependsOn = PREFERENCE_DEPENDENCIES[key];
  if (!dependsOn) return false;

  const parent = preferences.find(p => p.key === dependsOn);
  return !parent?.value;
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
