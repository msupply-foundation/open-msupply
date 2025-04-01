import React from 'react';
import {
  BasicSpinner,
  Box,
  DetailPanelSection,
  NothingHere,
  PreferenceDescriptionNode,
  PreferencesNode,
  useTranslation,
} from '@openmsupply-client/common';
import { usePreferences } from '../api/usePreferences';
import { EditField } from './EditField';
import { useEditPreference } from '../api/useEditPreference';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  const { data: prefs, isLoading } = usePreferences();
  const { mutateAsync: update } = useEditPreference(selected.key);

  if (isLoading) {
    return <BasicSpinner />;
  }

  const prefKey = getPrefKey(selected.key);
  if (!prefs || !prefKey) {
    return <NothingHere />;
  }

  const value = prefs[prefKey];

  return (
    <Box>
      <DetailPanelSection title={t('label.global-preference')}>
        <Box sx={{ backgroundColor: 'white', padding: 1, borderRadius: 1 }}>
          <EditField
            value={value}
            config={selected}
            // TODO: backend would generate IDs, just send the value
            onChange={value => update({ value, id: `${selected.key}_global` })}
          />
        </Box>
      </DetailPanelSection>
      <Box sx={{ height: 10 }} />
    </Box>
  );
};

function getPrefKey(key: string): keyof PreferencesNode | undefined {
  switch (key) {
    case 'show_contact_tracing':
      return 'showContactTracing';
  }
}
