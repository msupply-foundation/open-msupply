import React, { ReactElement } from 'react';
import {
  useTranslation,
  useNotification,
  DetailPanelPortal,
  DetailPanelAction,
  DeleteIcon,
  PurchaseOrderNodeStatus,
  useDeleteConfirmation,
  useNavigate,
  RouteBuilder,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../api/hooks/usePurchaseOrder';
import { PurchaseOrderFragment, usePurchaseOrderList } from '../../api';
import { DateSection } from './DateSection';
import { OtherSection } from './OtherSection';
import { PricingSection } from './PricingSection';
import { isPurchaseOrderDisabled } from '../../../utils';
import { AppRoute } from 'packages/config/src';

export const SidePanel = (): ReactElement => {
  const t = useTranslation();
  const { error } = useNotification();
  const navigate = useNavigate();

  const {
    update: { update },
    draft,
    handleChange,
  } = usePurchaseOrder();
  const {
    delete: { deletePurchaseOrders },
  } = usePurchaseOrderList();
  const disabled = draft ? isPurchaseOrderDisabled(draft) : false;
  const canDelete =
    draft?.status === PurchaseOrderNodeStatus.New ||
    draft?.status === PurchaseOrderNodeStatus.RequestApproval;

  const handleUpdate = async (input: Partial<PurchaseOrderFragment>) => {
    try {
      await update(input);
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  const deleteAction = async () => {
    if (!draft) return;
    if (draft?.id) {
      deletePurchaseOrders([draft.id]);
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.PurchaseOrder)
          .build()
      );
    }
  };

  const onDelete = useDeleteConfirmation({
    selectedRows: [draft],
    deleteAction,
    canDelete,
    messages: {
      confirmMessage: t('messages.confirm-delete-purchase-orders', {
        count: 1,
      }),
      deleteSuccess: t('messages.deleted-purchase-orders', {
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
        </>
      }
    >
      <PricingSection
        draft={draft}
        onChange={handleChange}
        disabled={disabled}
      />
      <OtherSection
        draft={draft}
        onUpdate={handleUpdate}
        onChange={handleChange}
      />
      <DateSection draft={draft} onUpdate={handleUpdate} />
    </DetailPanelPortal>
  );
};
