import React from 'react';
import {
  NothingHere,
  PreferenceDescriptionNode,
  PreferenceValueNodeType,
  UpsertPreferencesInput,
} from '@openmsupply-client/common';
import {
  EditPreference,
  PreferenceSearchInput,
  usePreferenceSearch,
} from '../../../Manage/Preferences';

interface EditStorePreferencesProps {
  storeId: string;
  preferences: PreferenceDescriptionNode[];
  update: (input: Partial<UpsertPreferencesInput>) => void;
}

export const EditStorePreferences = ({
  storeId,
  preferences,
  update,
}: EditStorePreferencesProps) => {
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
              preference={pref}
              isAutoSave={false}
              update={async value => {
                const finalValue =
                  (pref.valueType === PreferenceValueNodeType.Integer ||
                    pref.valueType === PreferenceValueNodeType.Float) &&
                    value === undefined
                    ? 0
                    : value;
                update({
                  [pref.key]: [{ storeId, value: finalValue }],
                });
                return true;
              }}
              isLast={isLast}
            />
          );
        })
      )}
    </>
  );
};
