import React, { memo } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  CopyIcon,
  DeleteIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useDeleteConfirmation,
  useConfirmationModal,
  useTranslation,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { useOutbound } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { TransportSection } from './TransportSection';
import { canDeleteInvoice } from '../../../utils';

export const SidePanelComponent = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, warning } = useNotification();
  const { data } = useOutbound.document.get();
  const { mutateAsync } = useOutbound.document.delete();
  const { duplicate } = useOutbound.document.duplicate();
  const canDelete = data ? canDeleteInvoice(data) : false;

  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync([data]);
    navigate(
      RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.OutboundShipment)
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
      message: t('messages.confirm-duplicate-shipment-customer', {
        number: data.invoiceNumber,
        customerName: data.otherPartyName,
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
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.OutboundShipment)
            .addPart(id)
            .build()
        );
      },
    });
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
            title={t('button.make-a-copy')}
            onClick={duplicateAction}
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
      <TransportSection />
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
