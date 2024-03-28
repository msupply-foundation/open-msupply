import React, { memo } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import {
  CopyIcon,
  DeleteIcon,
  DetailPanelAction,
  DetailPanelPortal,
  useNotification,
  useDeleteConfirmation,
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
  const t = useTranslation('distribution');
  const navigate = useNavigate();
  const { success } = useNotification();
  const { data } = useOutbound.document.get();
  const { mutateAsync } = useOutbound.document.delete();
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
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
      <PricingSection />
      <TransportSection />
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
