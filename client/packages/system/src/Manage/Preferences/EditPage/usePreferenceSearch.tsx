import { useMemo, useState } from 'react';
import { LocaleKey, useTranslation } from '@openmsupply-client/common';
import { AdminPreferenceFragment } from '../api/operations.generated';

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
