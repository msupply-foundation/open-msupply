import React, { useEffect } from 'react';
import {
  LocaleKey,
  UpsertPreferencesInput,
  useBreadcrumbs,
  useNotification,
  useParams,
  usePreferences,
  useTranslation,
} from '@openmsupply-client/common';
import { LineEditBase } from './LineEditBase';
import { useGlobalPrefList } from '../api';
import { EditPreference } from './EditPreference';
import { useEditPreference } from '../api/useEditPreference';
import { getPrefKey } from './getPrefKey';

export const EditPreferencesPage = () => {
  const t = useTranslation();
  const { key } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { error } = useNotification();

  const { data: prefOptions } = useGlobalPrefList();
  const { data: configuredPrefs } = usePreferences();
  const { mutateAsync } = useEditPreference();

  const update = async (input: Partial<UpsertPreferencesInput>) => {
    try {
      await mutateAsync(input);
    } catch (err) {
      console.error('Error updating preferences:', err);
      error(t('error.something-wrong'))();
    }
  };

  useEffect(() => {
    if (key)
      setCustomBreadcrumbs({
        1: t(`preference.${key}` as LocaleKey),
      });
  }, [key]);

  const selectedPref = prefOptions?.find(d => key === d.key);

  const clientKey = getPrefKey(selectedPref?.key ?? '');

  return (
    <LineEditBase currentKey={key ?? ''} prefs={prefOptions ?? []}>
      {selectedPref &&
        (!clientKey || !configuredPrefs ? (
          t('error.something-wrong')
        ) : (
          <EditPreference
            key={selectedPref.key}
            valueType={selectedPref.valueType}
            clientKey={clientKey}
            value={configuredPrefs[clientKey]}
            update={update}
          />
        ))}
    </LineEditBase>
  );
};
