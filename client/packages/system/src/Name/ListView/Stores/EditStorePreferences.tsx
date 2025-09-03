import React from 'react';
import {
  InputWithLabelRow,
  LocaleKey,
  NothingHere,
  PreferenceNodeType,
  useAuthContext,
  useIsCentralServerApi,
  UserPermission,
  useTranslation,
} from '@openmsupply-client/common';
import {
  EditPreference,
  useEditPreferences,
} from '../../../Manage/Preferences';

export const EditStorePreferences = ({ storeId }: { storeId: string }) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();
  const { userHasPermission } = useAuthContext();
  const { update, preferences } = useEditPreferences(
    PreferenceNodeType.Store,
    storeId
  );

  if (!preferences.length) return <NothingHere />;

  return preferences.map(pref => {
    const isLast = preferences[preferences?.length - 1]?.key === pref.key;

    return (
      <InputWithLabelRow
        key={pref.key}
        labelRight
        labelWidth={'100%'}
        label={t(`preference.${pref.key}` as LocaleKey)}
        Input={
          <EditPreference
            disabled={
              !isCentralServer ||
              !userHasPermission(UserPermission.EditCentralData)
            }
            preference={pref}
            update={value =>
              update({
                [pref.key]: [{ storeId, value }],
              })
            }
          />
        }
        sx={{
          borderBottom: isLast ? 'none' : '1px dashed',
          borderColor: 'gray.main',
          padding: 1,
        }}
      />
    );
  });
};
