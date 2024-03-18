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

export const SidePanelComponent = () => {
  const { success } = useNotification();
  const t = useTranslation('distribution');
  const { data } = useReturns.document.inboundReturn();
  const { mutateAsync } = useReturns.document.deleteInbound();

  const canDelete = data?.status === InvoiceNodeStatus.New;
  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync(data.id);
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-inbound-return', {
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
      {/* <RelatedDocumentsSection /> */}
      {/* <PricingSection /> */}
      {/* <TransportSection /> */}
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
