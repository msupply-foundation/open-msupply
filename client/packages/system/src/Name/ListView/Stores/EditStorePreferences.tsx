import React from 'react';
import {
  NothingHere,
  PreferenceNodeType,
  PreferenceValueNodeType,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import {
  EditPreference,
  PreferenceSearchInput,
  useEditPreferences,
  usePreferenceSearch,
} from '../../../Manage/Preferences';

interface EditStorePreferencesProps {
  storeId: string;
}

export const EditStorePreferences = ({
  storeId,
}: EditStorePreferencesProps) => {
  const isCentralServer = useIsCentralServerApi();
  const { update, preferences } = useEditPreferences(
    PreferenceNodeType.Store,
    storeId
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
              disabled={!isCentralServer}
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
        })
      )}
    </>
  );
};
