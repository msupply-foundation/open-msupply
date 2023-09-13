import React, { FC } from 'react';
import {
  CopyIcon,
  DeleteIcon,
  DetailPanelAction,
  DetailPanelPortal,
  InvoiceNodeStatus,
  useNotification,
  useDeleteConfirmation,
  useTranslation,
} from '@openmsupply-client/common';
import { useInbound } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { TransportSection } from './TransportSection';

export const SidePanel: FC = () => {
  const t = useTranslation('replenishment');
  const { success } = useNotification();
  const { data } = useInbound.document.get();
  const { mutateAsync } = useInbound.document.delete();
  const isTransfer = !!data?.linkedShipment?.id;
  const canDelete = data ? data?.status === InvoiceNodeStatus.New : false;

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success('Copied to clipboard successfully')());
  };

  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync([data]);
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-shipment', {
        number: data?.invoiceNumber,
      }),
      deleteSuccess: t('messages.deleted-shipments', {
        count: 1,
      }),
    },
  });

  return (
    <DetailPanelPortal
      Actions={
        <>
          <DetailPanelAction
            icon={<DeleteIcon />}
            title={t('label.delete')}
            onClick={onDelete}
            disabled={!canDelete}
          />
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
      <PricingSection />
      {isTransfer && <TransportSection />}
    </DetailPanelPortal>
  );
};
