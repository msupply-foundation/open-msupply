import React from 'react';
import {
  Box,
  InputWithLabelRow,
  LocaleKey,
  NothingHere,
  PreferenceNodeType,
  useTranslation,
} from '@openmsupply-client/common';
import { EditPreference } from './EditPreference';
import { useEditPreferences } from '../api/useEditPreference';
import { PreferenceGroupAccordion } from './PreferenceGroupAccordion';
import { usePreferenceGrouping } from './usePreferenceGrouping';

export const EditPreferencesPage = () => {
  const t = useTranslation();
  const { update, preferences } = useEditPreferences(PreferenceNodeType.Global);
  const { ungrouped, groups } = usePreferenceGrouping(preferences);

  if (!preferences.length) return <NothingHere />;

  return (
    <Box display="flex" justifyContent="center" width="100%" marginTop={2}>
      <Box width="600px">
        {ungrouped.map((pref, idx) => {
          const isLast = idx === ungrouped.length - 1;
          return (
            <InputWithLabelRow
              key={pref.key}
              labelWidth={'100%'}
              label={t(`preference.${pref.key}` as LocaleKey)}
              Input={
                <EditPreference
                  preference={pref}
                  update={value => update({ [pref.key]: value })}
                />
              }
              sx={{
                justifyContent: 'center',
                borderBottom: isLast ? 'none' : '1px dashed',
                borderColor: 'gray.main',
                padding: 1,
              }}
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
        <Box pb={1} /> {/* Spacer at bottom */}
      </Box>
    </Box>
  );
};
