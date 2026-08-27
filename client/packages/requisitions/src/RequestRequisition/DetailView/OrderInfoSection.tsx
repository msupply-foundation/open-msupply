import React from 'react';
import {
  Grid,
  useTranslation,
  DetailPanelSection,
  PanelRow,
  PanelLabel,
  PanelField,
} from '@openmsupply-client/common';
import { useRequest } from '../api';
import { getApprovalStatusKey } from '../../utils';

export const OrderInfoSection = () => {
  const t = useTranslation();
  const { linkedRequisition } = useRequest.document.fields([
    'programName',
    'linkedRequisition',
  ]);
  const { usesRemoteAuthorisation } = useRequest.utils.isRemoteAuthorisation();

  if (!usesRemoteAuthorisation) {
    return null;
  }

  return (
    <DetailPanelSection title={t('heading.order-info')}>
      <Grid container gap={0.5} key="order-info">
        {usesRemoteAuthorisation && (
          <PanelRow>
            <PanelLabel>{t('label.auth-status')}</PanelLabel>
            <PanelField>
              {t(getApprovalStatusKey(linkedRequisition?.approvalStatus))}
            </PanelField>
          </PanelRow>
        )}
      </Grid>
    </DetailPanelSection>
  );
};
