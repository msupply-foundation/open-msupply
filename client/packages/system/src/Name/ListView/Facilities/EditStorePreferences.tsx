import React from 'react';
import {
  InputWithLabelRow,
  LocaleKey,
  NothingHere,
  PreferenceNodeType,
  useIsCentralServerApi,
  useTranslation,
} from '@openmsupply-client/common';
import {
  EditPreference,
  useEditPreferences,
} from '../../../Manage/Preferences';

export const EditStorePreferences = ({ storeId }: { storeId: string }) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const { update, preferences } = useEditPreferences(
    PreferenceNodeType.Store,
    storeId
  );

  if (!preferences.length) return <NothingHere />;

  return preferences.map(pref => {
    return (
      <InputWithLabelRow
        key={pref.key}
        label={t(`preference.${pref.key}` as LocaleKey)}
        Input={
          <EditPreference
            disabled={!isCentralServer}
            preference={pref}
            update={value => {
              // For store prefs, send an array with storeId and value
              update({
                [pref.key]: [{ storeId, value }],
              });
            }}
          />
        }
      />
    );
  });
};
