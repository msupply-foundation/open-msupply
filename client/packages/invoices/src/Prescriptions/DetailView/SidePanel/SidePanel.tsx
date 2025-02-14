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
  InvoiceNodeStatus,
  useConfirmationModal,
} from '@openmsupply-client/common';
import { usePrescription } from '../../api';
import { AdditionalInfoSection } from './AdditionalInfoSection';
import { PricingSection } from './PricingSection';
import { canCancelInvoice, canDeleteInvoice } from '../../../utils';
import { PatientDetails } from './PatientDetails';

export const SidePanelComponent = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success } = useNotification();
  const {
    query: { data },
    update: { update },
    delete: { deletePrescription },
  } = usePrescription();
  const canDelete = data ? canDeleteInvoice(data) : false;
  const canCancel = data ? canCancelInvoice(data) : false;

  const deleteAction = async () => {
    await deletePrescription();
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

  const onCancel = useConfirmationModal({
    onConfirm: () => update({ status: InvoiceNodeStatus.Cancelled }),
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-cancel-prescription'),
  });

  return (
    <DetailPanelPortal
      Actions={
        <>
          {canDelete && (
            <DetailPanelAction
              icon={<DeleteIcon />}
              title={t('label.delete')}
              onClick={onDelete}
            />
          )}
          {canCancel && (
            <DetailPanelAction
              icon={<DeleteIcon />}
              title={t('label.cancel')}
              onClick={onCancel}
            />
          )}
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
      <PatientDetails />
    </DetailPanelPortal>
  );
};

export const SidePanel = memo(SidePanelComponent);
