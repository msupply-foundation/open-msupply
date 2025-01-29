import React from 'react';
import {
  BufferedTextArea,
  BufferedTextInput,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  Grid,
  PanelField,
  PanelLabel,
  PanelRow,
  RnRFormNodeStatus,
  useFormatDateTime,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import { useRnRForm } from '../api';

export const SidePanel = ({ rnrFormId }: { rnrFormId: string }) => {
  const { success } = useNotification();
  const t = useTranslation('distribution');
  const { localisedDate } = useFormatDateTime();
  const {
    query: { data },
    bufferedDetails,
    updateRnRForm,
  } = useRnRForm({ rnrFormId });

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data ?? {}, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  if (!data) return null;

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

        <Grid container gap={1} marginTop={2}>
          <PanelRow>
            <PanelLabel flex={0.5}>{t('heading.reference')}</PanelLabel>
            <PanelField>
              <BufferedTextInput
                disabled={data.status === RnRFormNodeStatus.Finalised}
                onChange={e =>
                  updateRnRForm({ theirReference: e.target.value })
                }
                value={bufferedDetails?.theirReference ?? ''}
                slotProps={{
                  input: {
                    sx: { backgroundColor: 'white' },
                  },
                }}
              />
            </PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel flex={0.5}>{t('heading.comment')}</PanelLabel>
            <PanelField>
              <BufferedTextArea
                disabled={data.status === RnRFormNodeStatus.Finalised}
                onChange={e => updateRnRForm({ comment: e.target.value })}
                value={bufferedDetails?.comment ?? ''}
              />
            </PanelField>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
