import React, { useEffect } from 'react';
import {
  LocaleKey,
  useBreadcrumbs,
  useParams,
  useTranslation,
} from '@openmsupply-client/common';
import { LineEditBase } from './LineEditBase';
import { useAvailablePreferences } from '../api';
import { EditPreference } from './EditPreference';

export const PreferencesLineEdit = () => {
  const t = useTranslation();
  const { key } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const { data } = useAvailablePreferences();

  useEffect(() => {
    if (key)
      setCustomBreadcrumbs({
        1: t(`preference.${key}` as LocaleKey),
      });
  }, [key]);

  const selectedPref = data?.find(d => key === d.key);

  return (
    <LineEditBase currentKey={key ?? ''} prefs={data ?? []}>
      {selectedPref && <EditPreference selected={selectedPref} />}
    </LineEditBase>
  );
};
