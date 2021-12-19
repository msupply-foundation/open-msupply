import React, { FC } from 'react';
// import { Link } from 'react-router-dom';
import {
  Grid,
  CopyIcon,
  DetailPanelAction,
  DetailPanelPortal,
  DetailPanelSection,
  PanelField,
  PanelLabel,
  PanelRow,
  BufferedTextArea,
  useNotification,
  useTranslation,
  // ColorSelectButton,
} from '@openmsupply-client/common';
import { InboundShipment } from '../../types';
import { useInboundFields, useIsInboundEditable } from './api';

interface SidePanelProps {
  draft: InboundShipment;
}

const AdditionalInfoSection: FC = () => {
  const { comment, update } = useInboundFields('comment');
  const isEditable = useIsInboundEditable();
  const t = useTranslation(['common', 'replenishment']);

  return (
    <DetailPanelSection title={t('heading.additional-info')}>
      <Grid container gap={0.5} key="additional-info">
        <PanelRow>
          <PanelLabel>{t('label.entered-by')}</PanelLabel>
          {/* <PanelField>{draft.enteredByName}</PanelField> */}
        </PanelRow>

        <PanelRow>
          <PanelLabel>{t('label.color')}</PanelLabel>
          <PanelField>
            {/* <ColorSelectButton
              disabled={!isInboundEditable(draft)}
              onChange={color => draft.update?.('color', color.hex)}
              color={draft.color}
            /> */}
          </PanelField>
        </PanelRow>

        <PanelLabel>{t('heading.comment')}</PanelLabel>
        <BufferedTextArea
          disabled={!isEditable}
          onChange={e => update({ comment: e.target.value })}
          value={comment}
        />
      </Grid>
    </DetailPanelSection>
  );
};

// const RelatedDocumentsRow: FC<{
//   label: string;
//   to: string;
//   value?: number | null;
// }> = ({ label, to, value }) => {
//   const { success } = useNotification();
//   return (
//     <PanelRow>
//       <PanelLabel>{label}</PanelLabel>
//       <PanelField>
//         <Link to={to} onClick={success('Not implemented yet!')}>
//           {value}
//         </Link>
//       </PanelField>
//     </PanelRow>
//   );
// };

const RelatedDocumentsSection: FC = () => {
  const t = useTranslation(['common', 'distribution']);
  return (
    <DetailPanelSection
      title={t('heading.related-documents', { ns: 'distribution' })}
    >
      <Grid container gap={0.5} key="additional-info">
        {/* <RelatedDocumentsRow
          label={t('label.requisition')}
          to=""
          value={draft.requisitionNumber}
        />
        <RelatedDocumentsRow
          label={t('label.inbound-shipment')}
          to=""
          value={draft.inboundShipmentNumber}
        />
        <RelatedDocumentsRow
          label={t('label.goods-receipt')}
          to=""
          value={draft.goodsReceiptNumber}
        />
        <RelatedDocumentsRow
          label={t('label.purchase-order')}
          to=""
          value={draft.purchaseOrderNumber}
        /> */}
      </Grid>
    </DetailPanelSection>
  );
};

export const SidePanel: FC<SidePanelProps> = ({ draft }) => {
  const { success } = useNotification();
  const t = useTranslation(['distribution', 'common']);

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
                  draft.items.forEach(item => {
                    console.table(item);
                    Object.values(item.batches).forEach(batch => {
                      console.table(batch);
                    });
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
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
    </DetailPanelPortal>
  );
};
