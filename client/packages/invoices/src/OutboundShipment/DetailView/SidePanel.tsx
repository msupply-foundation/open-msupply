import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  TextArea,
  useNotification,
  useTranslation,
  ColorSelectButton,
  LocaleKey,
} from '@openmsupply-client/common';
import React, { FC } from 'react';
import { Link } from 'react-router-dom';
import { isInvoiceEditable } from '../utils';
import { OutboundShipment } from './types';

interface SidePanelProps {
  draft: OutboundShipment;
}

const AdditionalInfoSection: FC<SidePanelProps> = ({ draft }) => {
  const t = useTranslation();

  return (
    <DetailPanelSection titleKey="heading.additional-info">
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          <PanelField>{draft.enteredByName}</PanelField>
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            <ColorSelectButton
              disabled={!isInvoiceEditable(draft)}
              onChange={color => draft.update?.('color', color.hex)}
              color={draft.color}
            />
          </PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <TextArea
          disabled={!isInvoiceEditable(draft)}
          onChange={e => draft.update?.('comment', e.target.value)}
          value={draft.comment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

const RelatedDocumentsRow: FC<{
  label: LocaleKey;
  to: string;
  value?: number | null;
}> = ({ label, to, value }) => {
  const t = useTranslation();
  const { success } = useNotification();
  return (
    <PanelRow>
      <PanelLabel>{t(label)}</PanelLabel>
      <PanelField>
        <Link to={to} onClick={success('Not implemented yet!')}>
          {value}
        </Link>
      </PanelField>
    </PanelRow>
  );
};

const RelatedDocumentsSection: FC<SidePanelProps> = ({ draft }) => {
  return (
    <DetailPanelSection titleKey="heading.related-documents">
      <Grid container gap={0.5} key="additional-info">
        <RelatedDocumentsRow
          label="label.requisition"
          to=""
          value={draft.requisitionNumber}
        />
        <RelatedDocumentsRow
          label="label.inbound-shipment"
          to=""
          value={draft.inboundShipmentNumber}
        />
        <RelatedDocumentsRow
          label="label.goods-receipt"
          to=""
          value={draft.goodsReceiptNumber}
        />
        <RelatedDocumentsRow
          label="label.purchase-order"
          to=""
          value={draft.purchaseOrderNumber}
        />
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC<SidePanelProps> = ({ draft }) => {
  const { success } = useNotification();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(draft, null, 4) ?? '');
    success('Copied to clipboard successfully')();
  };

  return (
    <DetailPanelPortal
      Actions={
        <DetailPanelAction
          icon={<CopyIcon />}
          titleKey="link.copy-to-clipboard"
          onClick={copyToClipboard}
        />
      }
    >
      <AdditionalInfoSection draft={draft} />
      <RelatedDocumentsSection draft={draft} />
    </DetailPanelPortal>
  );
};
