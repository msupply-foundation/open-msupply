import React from 'react';
import { LineEditBase } from './LineEditBase';
import { useAvailablePreferences } from '../api';

export const PreferencesLineEdit = () => {
  const {
    query: { data },
  } = useAvailablePreferences();
  return (
    <LineEditBase currentKey={null} prefs={data ?? []}>
      ELLLOO
    </LineEditBase>
  );
};
