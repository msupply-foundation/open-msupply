import React from 'react';
import {
  Box,
  DetailPanelSection,
  PreferenceDescriptionNode,
  useTranslation,
} from '@openmsupply-client/common';
import { JsonForm } from '@openmsupply-client/programs';

export const EditPreference = ({
  selected,
}: {
  selected: PreferenceDescriptionNode;
}) => {
  const t = useTranslation();

  return (
    <Box>
      <DetailPanelSection title={t('label.global-preference')}>
        <Box sx={{ width: 300 }}>
          <JsonForm
            data={{
              value: true,
            }}
            jsonSchema={{
              properties: { value: { type: selected?.jsonFormsInputType } },
            }}
            uiSchema={{ type: 'Control', scope: '#/properties/value' }}
            isError={false}
            isLoading={false}
            updateData={console.log}
          />
        </Box>
      </DetailPanelSection>
    </Box>
  );
};
