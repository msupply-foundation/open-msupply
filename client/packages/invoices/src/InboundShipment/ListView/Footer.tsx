import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  CopyIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
  useNavigate,
  useNotification,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { InboundRowFragment, useInboundList } from '../api';
import { canDeleteInbound } from '../../utils';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: InboundRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const {
    delete: { deleteInbounds },
    duplicate: { duplicate },
  } = useInboundList();

  const deleteAction = async () => {
    await deleteInbounds(selectedRows);
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(canDeleteInbound),
    messages: {
      confirmMessage: t('messages.confirm-delete-shipments', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-shipments', {
        count: selectedRows.length,
      }),
    },
  });

  const onlyOneSelected = selectedRows.length === 1;

  const duplicateAction = async () => {
    const source = selectedRows[0];
    if (!source) return;
    try {
      const { id, invoiceNumber } = await duplicate(source.id);
      resetRowSelection();
      success(
        t('messages.shipment-copied', {
          newNumber: invoiceNumber,
          sourceNumber: source.invoiceNumber,
        })
      )();
      navigate(
        RouteBuilder.create(AppRoute.Replenishment)
          .addPart(AppRoute.InboundShipment)
          .addPart(id)
          .build()
      );
    } catch (e) {
      error(
        t('error.failed-to-duplicate-shipment', {
          message: (e as Error).message,
        })
      )();
    }
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
    {
      label: t('button.make-a-copy'),
      icon: <CopyIcon />,
      onClick: duplicateAction,
      disabled: !onlyOneSelected,
      tooltip: onlyOneSelected
        ? undefined
        : t('messages.select-single-shipment-to-copy'),
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={resetRowSelection}
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
