import React, { FC } from 'react';

import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelLabel,
  TextArea,
  useNotification,
  useTranslation,
  PanelRow,
  PanelField,
  ColorSelectButton,
  useFormatDate,
  DatePickerInput,
} from '@openmsupply-client/common';
import { isRequisitionEditable } from '../../utils';
import { CustomerRequisition } from '../../types';

interface SidePanelProps {
  draft: CustomerRequisition;
}

const AdditionalInfoSection: FC<SidePanelProps> = ({ draft }) => {
  const t = useTranslation('common');

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={!isRequisitionEditable(draft)}
              onChange={color => draft.update('color', color.hex)}
              color={draft?.color}
            />
          </PanelField>
        </PanelRow>
        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <TextArea
          disabled={!isRequisitionEditable(draft)}
          onChange={e => draft.update('comment', e.target.value)}
          value={draft.comment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

const RelatedDocumentsSection: FC<SidePanelProps> = () => {
  const t = useTranslation(['common', 'distribution']);
  return (
    <DetailPanelSection
      title={t('heading.related-documents', { ns: 'distribution' })}
    >
      <Grid container gap={0.5} key="additional-info"></Grid>
    </DetailPanelSection>
  );
};

const DatesSection: FC<SidePanelProps> = ({ draft }) => {
  const t = useTranslation(['common', 'distribution']);
  const d = useFormatDate();
  return (
    <DetailPanelSection
      title={t('heading.related-documents', { ns: 'distribution' })}
    >
      <Grid container gap={0.5}>
        <PanelRow>
          <PanelLabel>Order date:</PanelLabel>

          <DatePickerInput value={draft.orderDate} onChange={() => {}} />
        </PanelRow>
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC<SidePanelProps> = ({ draft }) => {
  const { success } = useNotification();
  const t = useTranslation(['outbound-shipment', 'common']);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  return (
    <DetailPanelPortal
      Actions={
        <>
          {!process.env['NODE_ENV'] ||
            (process.env['NODE_ENV'] === 'development' && (
              <DetailPanelAction
                icon={<CopyIcon />}
                title={t('dev.log-draft')}
                onClick={() => {
                  console.table(draft);
                  draft.lines.forEach(item => {
                    console.table(item);
                  });
                }}
              />
            ))}
          <DetailPanelAction
            icon={<CopyIcon />}
            title={t('link.copy-to-clipboard')}
            onClick={copyToClipboard}
          />
        </>
      }
    >
      <AdditionalInfoSection draft={draft} />
      <DatesSection draft={draft} />
      <RelatedDocumentsSection draft={draft} />
    </DetailPanelPortal>
  );
};
