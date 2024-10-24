import React from 'react';
import { DetailPanelSection } from '@common/components';
import { useTranslation } from '@common/intl';
import { useResponse } from '../api';
import {
  Grid,
  PanelField,
  PanelLabel,
  PanelRow,
} from '@openmsupply-client/common';

export const ProgramInfoSection = () => {
  const t = useTranslation();
  const { orderType, programName, period } = useResponse.document.fields([
    'orderType',
    'programName',
    'period',
  ]);

  return programName ? (
    <DetailPanelSection title={t('heading.program-info')}>
      <Grid container gap={0.5} key="program-info">
        <PanelRow>
          <PanelLabel>{t('label.order-type')}</PanelLabel>
          <PanelField>{orderType ?? ''}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.program')}</PanelLabel>
          <PanelField>{programName ?? ''}</PanelField>
        </PanelRow>
        <PanelRow>
          <PanelLabel>{t('label.period')}</PanelLabel>
          <PanelField>{period?.name ?? ''}</PanelField>
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  ) : (
    <></>
  );
};
