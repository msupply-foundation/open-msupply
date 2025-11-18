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
import { usePreferenceSearch } from '../../../Manage/Preferences/EditPage/usePreferenceSearch';
import { PreferenceSearchInput } from '../../../Manage/Preferences/EditPage/PreferenceSearchInput';

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
  const { searchTerm, setSearchTerm, filteredPreferences, hasSearchTerm } =
    usePreferenceSearch(preferences);

  if (!preferences.length) return <NothingHere />;

  return (
    <>
      <PreferenceSearchInput value={searchTerm} onChange={setSearchTerm} />
      {hasSearchTerm && filteredPreferences.length === 0 ? (
        <NothingHere />
      ) : (
        filteredPreferences.map((pref, idx) => {
          const isLast = idx === filteredPreferences.length - 1;

          return (
            <EditPreference
              key={pref.key}
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
              isLast={isLast}
            />
          );
        })
      )}
    </>
  );
};
