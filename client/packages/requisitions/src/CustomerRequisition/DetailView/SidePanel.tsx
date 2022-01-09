import React, { FC } from 'react';
import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  useNotification,
  useTranslation,
  PanelRow,
  PanelField,
  ColorSelectButton,
  useBufferState,
  BufferedTextArea,
} from '@openmsupply-client/common';
import {
  useIsCustomerRequisitionDisabled,
  useCustomerRequisitionFields,
  useCustomerRequisition,
} from '../api';

const AdditionalInfoSection: FC = () => {
  const isDisabled = useIsCustomerRequisitionDisabled();
  const { color, comment, update } = useCustomerRequisitionFields([
    'color',
    'comment',
  ]);
  const [bufferedColor, setBufferedColor] = useBufferState(color);
  const t = useTranslation('common');

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={isDisabled}
              onChange={color => {
                setBufferedColor(color.hex);
                update({ color: color.hex });
              }}
              color={bufferedColor ?? ''}
            />
          </PanelField>
        </PanelRow>
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={isDisabled}
          onChange={e => update({ comment: e.target.value })}
          value={comment ?? ''}
        />
      </Grid>
    </DetailPanelSection>
  );
};

const RelatedDocumentsSection: FC = () => {
  const t = useTranslation('distribution');
  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid container gap={0.5} key="additional-info"></Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC = () => {
  const { success } = useNotification();
  const t = useTranslation(['distribution', 'common']);
  const { data } = useCustomerRequisition();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 4) ?? '');
    success('Copied to clipboard successfully')();
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
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
    </DetailPanelPortal>
  );
};
