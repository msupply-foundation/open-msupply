import React, { Dispatch, SetStateAction } from 'react';
import {
  NothingHere,
  PreferenceNodeType,
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
  setIsActionValid: Dispatch<SetStateAction<boolean>>;
}

export const EditStorePreferences = ({
  storeId,
  setIsActionValid,
}: EditStorePreferencesProps) => {
  const isCentralServer = useIsCentralServerApi();
  const { userHasPermission } = useAuthContext();
  const { update, preferences } = useEditPreferences(
    PreferenceNodeType.Store,
    storeId,
    setIsActionValid
  );

  if (!preferences.length) return <NothingHere />;

  return preferences.map(pref => {
    const isLast = preferences[preferences?.length - 1]?.key === pref.key;

    return (
      <EditPreference
        key={pref.key}
        disabled={
          !isCentralServer || !userHasPermission(UserPermission.EditCentralData)
        }
        preference={pref}
        update={value =>
          update({
            [pref.key]: [{ storeId, value }],
          })
        }
        isLast={isLast}
      />
    );
  });
};
