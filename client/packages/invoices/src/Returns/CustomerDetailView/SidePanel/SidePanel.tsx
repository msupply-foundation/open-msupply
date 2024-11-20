import React, { memo } from 'react';
import {
  CopyIcon,
  DeleteIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useDeleteConfirmation,
  useTranslation,
  InvoiceNodeStatus,
} from '@openmsupply-client/common';
import { useReturns } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { TransportSection } from './TransportSection';

export const SidePanelComponent = () => {
  const { success } = useNotification();
  const t = useTranslation();
  const { data } = useReturns.document.customerReturn();
  const { mutateAsync } = useReturns.document.deleteCustomer();

  const isTransfer = !!data?.linkedShipment?.id;

  const canDelete = data?.status === InvoiceNodeStatus.New;
  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync(data.id);
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-customer-return', {
        number: data?.invoiceNumber,
      }),
      deleteSuccess: t('messages.deleted-returns', {
        count: 1,
      }),
    },
  });

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

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
      {/* <PricingSection /> */}
      {isTransfer && <TransportSection />}
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
