import React from 'react';
import {
  NothingHere,
  PreferenceNodeType,
  PreferenceValueNodeType,
  useAuthContext,
  useIsCentralServerApi,
  UserPermission,
} from '@openmsupply-client/common';
import {
  EditPreference,
  useEditPreferences,
} from '../../../Manage/Preferences';

interface EditStorePreferencesProps {
  storeId: string;
}

export const EditStorePreferences = ({
  storeId,
}: EditStorePreferencesProps) => {
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
      <EditPreference
        disabled={
          !isCentralServer || !userHasPermission(UserPermission.EditCentralData)
        }
        preference={pref}
        update={value => {
          const finalValue =
            pref.valueType === PreferenceValueNodeType.Integer &&
            value === undefined
              ? 0
              : value;
          return update({
            [pref.key]: [{ storeId, value: finalValue }],
          });
        }}
        isLast={isLast}
      />
    );
  });
};
