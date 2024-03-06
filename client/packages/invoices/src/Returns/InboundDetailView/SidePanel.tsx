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
import { useReturns } from '../api';

export const SidePanelComponent = () => {
  const { success } = useNotification();
  const t = useTranslation('distribution');
  const { data } = useReturns.document.inboundReturn();
  // const { mutateAsync } = useOutbound.document.delete();
  const canDelete = data?.status === InvoiceNodeStatus.New;
  const deleteAction = async () => {
    if (!data) return;
    // await mutateAsync([data]);
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      // why no workie
      confirmMessage: t('messages.confirm-delete-returns', {
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
      .then(() => success('Copied to clipboard successfully')());
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
      {/* <AdditionalInfoSection />
      <RelatedDocumentsSection />
      <PricingSection />
      <TransportSection /> */}
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
