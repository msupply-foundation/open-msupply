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

export const EditPreferencesPage = () => {
  const t = useTranslation();

  const { update, preferences } = useEditPreferences(PreferenceNodeType.Global);

  if (!preferences.length) return <NothingHere />;

  return (
    <Box display="flex" justifyContent="center" width="100%" marginTop={2}>
      <Box width="600px">
        {preferences.map(pref => (
          <InputWithLabelRow
            key={pref.key}
            label={t(`preference.${pref.key}` as LocaleKey)}
            Input={
              <EditPreference
                preference={pref}
                update={value => update({ [pref.key]: value })}
              />
            }
            labelWidth="200px"
            sx={{
              justifyContent: 'center',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};
