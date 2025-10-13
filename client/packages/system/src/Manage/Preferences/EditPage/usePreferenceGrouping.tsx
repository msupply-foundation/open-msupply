import { PreferenceKey } from '@openmsupply-client/common';
import { AdminPreferenceFragment } from '../api/operations.generated';

interface PreferenceGroup {
  key: string;
  preferences: AdminPreferenceFragment[];
}

interface GroupedPreferences {
  ungrouped: AdminPreferenceFragment[];
  groups: PreferenceGroup[];
}

// Grouping of global preferences
const PREFERENCE_GROUP_CONFIG: Record<string, PreferenceKey[]> = {
  'label.amc-calculation': [
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

export const usePreferenceGrouping = (
  preferences: AdminPreferenceFragment[]
): GroupedPreferences => {
  const keyToGroup: Partial<Record<PreferenceKey, string>> = {};

  Object.entries(PREFERENCE_GROUP_CONFIG).forEach(([labelKey, keys]) => {
    keys.forEach(key => {
      keyToGroup[key] = labelKey;
    });
  });

  const groupsObject: Record<string, AdminPreferenceFragment[]> = {};
  const ungrouped: AdminPreferenceFragment[] = [];

  preferences.forEach(pref => {
    const groupLabel = keyToGroup[pref.key];

    if (groupLabel) {
      (groupsObject[groupLabel] ??= []).push(pref);
    } else {
      ungrouped.push(pref);
    }
  });

  const groups: PreferenceGroup[] = Object.entries(groupsObject).map(
    ([key, preferences]) => ({ key, preferences })
  );

  return { ungrouped, groups };
};
