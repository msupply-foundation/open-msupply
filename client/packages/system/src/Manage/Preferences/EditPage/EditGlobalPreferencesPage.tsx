import React from 'react';
import {
  Box,
  LocaleKey,
  NothingHere,
  PreferenceNodeType,
  useTranslation,
} from '@openmsupply-client/common';
import { EditPreference } from './EditPreference';
import { useEditPreferences } from '../api/useEditPreference';
import { PreferenceGroupAccordion } from './PreferenceGroupAccordion';
import { usePreferenceGrouping } from './usePreferenceGrouping';
import { PreferenceSearchInput } from './PreferenceSearchInput';
import { usePreferenceSearch } from './usePreferenceSearch';

export const EditGlobalPreferencesPage = () => {
  const t = useTranslation();
  const { update, preferences } = useEditPreferences(PreferenceNodeType.Global);
  const { searchTerm, setSearchTerm, filteredPreferences, hasSearchTerm } =
    usePreferenceSearch(preferences);
  const { ungrouped, groups } = usePreferenceGrouping(filteredPreferences);

  if (!preferences.length) return <NothingHere />;

  return (
    <Box display="flex" justifyContent="center" width="100%" marginTop={2}>
      <Box width="600px">
        <PreferenceSearchInput value={searchTerm} onChange={setSearchTerm} />
        {hasSearchTerm && filteredPreferences.length === 0 ? (
          <NothingHere />
        ) : (
          <>
            {ungrouped.map((pref, idx) => {
              const isLast = idx === ungrouped.length - 1;
              return (
                <EditPreference
                  key={pref.key}
                  preference={pref}
                  update={value => update({ [pref.key]: value })}
                  isLast={isLast}
                />
              );
            })}
            {groups.map(group => (
              <PreferenceGroupAccordion
                key={group.key}
                label={t(group.key as LocaleKey)}
                preferences={group.preferences}
                update={update}
              />
            ))}
          </>
        )}
        <Box pb={1} /> {/* Spacer at bottom */}
      </Box>
    </Box>
  );
};
