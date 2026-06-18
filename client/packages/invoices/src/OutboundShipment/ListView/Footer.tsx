import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  CopyIcon,
  useTranslation,
  AppFooterPortal,
  useConfirmationModal,
  useNavigate,
  useNotification,
  RouteBuilder,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { OutboundRowFragment, useOutbound } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: OutboundRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { success, warning } = useNotification();

  const { confirmAndDelete } = useOutbound.document.deleteRows(
    selectedRows,
    resetRowSelection
  );
  const { duplicate } = useOutbound.document.duplicate();

  const onlyOneSelected = selectedRows.length === 1;

  const getDuplicateConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: '',
  });

  const duplicateAction = () => {
    const source = selectedRows[0];
    if (!source) return;
    getDuplicateConfirmation({
      message: t('messages.confirm-duplicate-shipment-customer', {
        number: source.invoiceNumber,
        customerName: source.otherPartyName,
      }),
      onConfirm: async () => {
        const result = await duplicate(source.id);
        if (!result) return;

        const { id, invoiceNumber, skippedItemCount } = result;
        resetRowSelection();
        success(
          t('messages.shipment-copied', {
            newNumber: invoiceNumber,
            sourceNumber: source.invoiceNumber,
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
