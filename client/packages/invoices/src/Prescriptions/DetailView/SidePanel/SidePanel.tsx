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
import { usePrescription } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';
import { canDeleteInvoice } from '../../../utils';

export const SidePanelComponent = () => {
  const t = useTranslation('dispensary');
  const navigate = useNavigate();
  const { success } = useNotification();
  const { data } = usePrescription.document.get();
  const { mutateAsync } = usePrescription.document.delete();
  const canDelete = data ? canDeleteInvoice(data) : false;

  const deleteAction = async () => {
    if (!data) return;
    await mutateAsync([data]);
    navigate(
      RouteBuilder.create(AppRoute.Dispensary)
        .addPart(AppRoute.Prescription)
        .build()
    );
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(JSON.stringify(data, null, 4) ?? '')
      .then(() => success(t('message.copy-success'))());
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [data],
    deleteAction,
    messages: {
      confirmMessage: t('messages.confirm-delete-prescription', {
        number: data?.invoiceNumber,
      }),
      deleteSuccess: t('messages.deleted-prescriptions', {
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
      <PricingSection />
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
