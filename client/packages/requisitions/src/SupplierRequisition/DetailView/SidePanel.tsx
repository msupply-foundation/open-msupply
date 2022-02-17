import React, { FC } from 'react';

import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  BufferedTextArea,
  useNotification,
  useTranslation,
  PanelRow,
  PanelField,
  ColorSelectButton,
  useBufferState,
} from '@openmsupply-client/common';
import {
  useIsRequestRequisitionDisabled,
  useRequestRequisition,
  useRequestRequisitionFields,
} from '../api';

const AdditionalInfoSection: FC = () => {
  const isDisabled = useIsRequestRequisitionDisabled();
  const { colour, comment, update } = useRequestRequisitionFields([
    'colour',
    'comment',
  ]);
  const [bufferedColor, setBufferedColor] = useBufferState(colour);
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
                update({ colour: color.hex });
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
  const t = useTranslation('replenishment');
  return (
    <DetailPanelSection title={t('heading.related-documents')}>
      <Grid container gap={0.5} key="additional-info"></Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC = () => {
  const { data } = useRequestRequisition();
  const { success } = useNotification();
  const t = useTranslation(['replenishment', 'common']);

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
