import React from 'react';
import {
  CopyIcon,
  DeleteIcon,
  DetailPanelAction,
  DetailPanelPortal,
  InvoiceNodeStatus,
  useNotification,
  useDeleteConfirmation,
  useConfirmationModal,
  useTranslation,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { useInboundShipment } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { TransportSection } from './TransportSection';
import { AppRoute } from '@openmsupply-client/config';

export const SidePanel = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, warning } = useNotification();

  const {
    query: { data },
    delete: { deleteInbound },
    duplicate: { duplicate },
    hasMutatePermission,
  } = useInboundShipment();

  const isTransfer = !!data?.linkedShipment?.id;
  const canDelete = data?.status === InvoiceNodeStatus.New && hasMutatePermission;

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  const getDuplicateConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: '',
  });

  const duplicateAction = () => {
    if (!data) return;
    getDuplicateConfirmation({
      message: t('messages.confirm-duplicate-shipment', {
        number: data.invoiceNumber,
        supplierName: data.otherPartyName,
      }),
      onConfirm: async () => {
        const result = await duplicate(data.id);
        if (!result) return;

        const { id, invoiceNumber, skippedItemCount } = result;
        success(
          t('messages.shipment-copied', {
            newNumber: invoiceNumber,
            sourceNumber: data.invoiceNumber,
          })
        )();
        if (skippedItemCount > 0) {
          warning(
            t('messages.shipment-copied-skipped-items', {
              count: skippedItemCount,
            })
          )();
        }
        navigate(
          RouteBuilder.create(AppRoute.Replenishment)
            .addPart(AppRoute.InboundShipment)
            .addPart(id)
            .build()
        );
      },
    });
  };

  const deleteAction = async () => {
    if (!data) return;
    await deleteInbound();
    navigate(
      RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.InboundShipment)
        .build()
    );
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
            title={t('button.make-a-copy')}
            onClick={duplicateAction}
            disabled={!hasMutatePermission}
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
