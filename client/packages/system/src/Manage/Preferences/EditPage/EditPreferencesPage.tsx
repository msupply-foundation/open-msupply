import React from 'react';
import {
  Box,
  InputWithLabelRow,
  LocaleKey,
  NothingHere,
  PreferenceNodeType,
  UpsertPreferencesInput,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useAdminPrefsList } from '../api';
import { EditPreference } from './EditPreference';
import { useEditPreference } from '../api/useEditPreference';

export const EditPreferencesPage = () => {
  const t = useTranslation();
  const { error } = useNotification();

  const { data: preferences } = useAdminPrefsList(PreferenceNodeType.Global);
  const { mutateAsync } = useEditPreference();

  const update = async (input: Partial<UpsertPreferencesInput>) => {
    try {
      await mutateAsync(input);
    } catch (err) {
      console.error('Error updating preferences:', err);
      error(t('error.something-wrong'))();
    }
  };

  if (!preferences?.length) return <NothingHere />;

  return (
    <Box display="flex" justifyContent="center" width="100%" marginTop={2}>
      <Box width="600px">
        {preferences.map(pref => (
          <InputWithLabelRow
            key={pref.key}
            label={t(`preference.${pref.key}` as LocaleKey)}
            Input={<EditPreference preference={pref} update={update} />}
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
