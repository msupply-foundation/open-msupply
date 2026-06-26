import React from 'react';
import {
  CopyIcon,
  DeleteIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useDeleteConfirmation,
  useTranslation,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { useInboundShipment, useDuplicateInbound } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { TransportSection } from './TransportSection';
import { AppRoute } from '@openmsupply-client/config';

export const SidePanel = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success } = useNotification();

  const {
    query: { data },
    delete: { deleteInbound },
    hasMutatePermission,
    isDisabled,
  } = useInboundShipment();
  const { duplicateInbound } = useDuplicateInbound();

  const isTransfer = !!data?.linkedShipment?.id;
  const canDelete = !!data && !isDisabled;

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
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
      cantDelete: err => err.message,
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
            onClick={() => data && duplicateInbound(data)}
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
