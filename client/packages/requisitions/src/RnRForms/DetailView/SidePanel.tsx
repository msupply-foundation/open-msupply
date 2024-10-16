import React from 'react';
import {
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  PanelField,
  PanelLabel,
  PanelRow,
  useFormatDateTime,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { RnRFormFragment } from '../api';

export const SidePanel = ({ data }: { data: RnRFormFragment }) => {
  const { success } = useNotification();
  const t = useTranslation('distribution');
  const { localisedDate } = useFormatDateTime();

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  return (
    <DetailPanelPortal
      Actions={
        <DetailPanelAction
          icon={<CopyIcon />}
          title={t('link.copy-to-clipboard')}
          onClick={copyToClipboard}
        />
      }
    >
      <DetailPanelSection title={t('heading.additional-info')}>
        <Grid container gap={0.5} key="additional-info">
          <PanelRow>
            <PanelLabel>{t('label.program-name')}</PanelLabel>
            <PanelField>{data.programName}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.period')}</PanelLabel>
            <PanelField>{data.periodName}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.supplier')}</PanelLabel>
            <PanelField>{data.supplierName}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.created')}</PanelLabel>
            <PanelField>{localisedDate(data.createdDatetime)}</PanelField>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
