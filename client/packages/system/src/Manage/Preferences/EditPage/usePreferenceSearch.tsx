import { useMemo, useState } from 'react';
import {
  LocaleKey,
  typedEntries,
  useTranslation,
} from '@openmsupply-client/common';
import { AdminPreferenceFragment } from '../api/operations.generated';
import { PREFERENCE_GROUP_CONFIG } from './utils';

export const usePreferenceSearch = (preferences: AdminPreferenceFragment[]) => {
  const t = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPreferences = useMemo(() => {
    if (!searchTerm.trim()) {
      return preferences;
    }

    const lowerSearch = searchTerm.toLowerCase();

    return preferences.filter(pref => {
      const translatedLabel = t(`preference.${pref.key}` as LocaleKey);

      // Check if the pref is part of a group and include the group label in the search
      const groupLabelKey = typedEntries(PREFERENCE_GROUP_CONFIG).find(group =>
        !group || group[1] === undefined ? false : group[1].includes(pref.key)
      )?.[0];

      if (groupLabelKey) {
        const translatedGroupLabel = t(groupLabelKey);
        if (translatedGroupLabel.toLowerCase().includes(lowerSearch)) {
          return true;
        }
        // If a pref within the group matches, include it, this means we see the whole group if any sub pref matches
        const groupPrefs = PREFERENCE_GROUP_CONFIG[groupLabelKey];
        if (
          groupPrefs &&
          groupPrefs.some(key => {
            const groupPrefLabel = t(`preference.${key}` as LocaleKey);
            return groupPrefLabel.toLowerCase().includes(lowerSearch);
          })
        ) {
          return true;
        }
      }

      return translatedLabel.toLowerCase().includes(lowerSearch);
    });
  }, [preferences, searchTerm, t]);

  return {
    searchTerm,
    setSearchTerm,
    filteredPreferences,
    hasSearchTerm: searchTerm.trim().length > 0,
  };
};
