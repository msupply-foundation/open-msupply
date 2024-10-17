import React, { FC, memo } from 'react';
import {
  Grid,
  DetailPanelSection,
  PanelLabel,
  useTranslation,
  BasicTextInput,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';

export const TransportSectionComponent: FC = () => {
  const t = useTranslation('distribution');
  const { data } = useReturns.document.customerReturn();

  // the text input is read-only, as the transport reference is only populated
  // as part of the transfer creation process,
  // it isn't possible currently for users to edit it

  return (
    <DetailPanelSection title={t('heading.transport-details')}>
      <Grid container gap={0.5} key="transport-details">
        <PanelLabel display="flex" alignItems="center">
          {t('heading.reference')}
        </PanelLabel>
        <BasicTextInput
          disabled={true}
          value={data?.transportReference ?? ''}
          InputProps={{
            style: {
              backgroundColor: 'white',
            },
          }}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const TransportSection = memo(TransportSectionComponent);
