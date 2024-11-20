import React, { memo } from 'react';
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
import { AppRoute } from '@openmsupply-client/config';
import { useReturns } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
// import { PricingSection } from './PricingSection';
import { RelatedDocumentsSection } from './RelatedDocumentsSection';
import { TransportSection } from './TransportSection';
import { canDeleteInvoice } from '../../../utils';

export const SidePanelComponent = () => {
  const { success } = useNotification();
  const t = useTranslation();
  const { data } = useReturns.document.supplierReturn();
  const { mutateAsync } = useReturns.document.deleteSupplier();
  const navigate = useNavigate();

  const canDelete = data ? canDeleteInvoice(data) : false;
  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync(data.id);
    navigate(
      RouteBuilder.create(AppRoute.Replenishment)
        .addPart(AppRoute.SupplierReturn)
        .build()
    );
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-return', {
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
      <AdditionalInfoSection />
      <RelatedDocumentsSection />
      {/* <PricingSection /> */}
      <TransportSection />
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
