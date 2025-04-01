import React from 'react';
import {
  BasicSpinner,
  Box,
  DetailPanelSection,
  NothingHere,
  PreferenceDescriptionNode,
  useTranslation,
} from '@openmsupply-client/common';
import { usePreferencesByKey } from '../api/usePreferencesByKey';
import { EditField } from './EditField';
import { useEditPreference } from '../api/useEditPreference';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  const { data: prefs, isLoading } = usePreferencesByKey(selected.key);
  const { mutateAsync: update } = useEditPreference(selected.key);

  if (isLoading) {
    return <BasicSpinner />;
  }

  if (!prefs) {
    return <NothingHere />;
  }

  return (
    <Box>
      <DetailPanelSection title={t('label.global-preference')}>
        <Box sx={{ backgroundColor: 'white', padding: 1, borderRadius: 1 }}>
          <EditField
            value={prefs.global?.value}
            config={selected}
            onChange={value => update({ value, id: prefs?.global?.id })}
          />
        </Box>
      </DetailPanelSection>
      <Box sx={{ height: 10 }} />
    </Box>
  );
};
