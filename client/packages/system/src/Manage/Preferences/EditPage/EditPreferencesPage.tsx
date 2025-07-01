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
        {preferences.map(pref => {
          const isLast = preferences[preferences?.length - 1]?.key === pref.key;

          return (
            <InputWithLabelRow
              key={pref.key}
              labelRight
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
      </Box>
    </Box>
  );
};
