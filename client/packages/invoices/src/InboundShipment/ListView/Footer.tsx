import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  CopyIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import {
  InboundRowFragment,
  useInboundList,
  useDuplicateInbound,
} from '../api';
import { canDeleteInbound } from '../../utils';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: InboundRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();

  const {
    delete: { deleteInbounds },
  } = useInboundList();
  const { duplicateInbound, hasMutatePermission } = useDuplicateInbound();

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

  const source = selectedRows[0];
  const onlyOneSelected = selectedRows.length === 1;
  const canDuplicate =
    onlyOneSelected && !!source && hasMutatePermission(!!source.purchaseOrder);

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
      testId: 'delete-lines-button',
    },
    {
      label: t('button.make-a-copy'),
      icon: <CopyIcon />,
      onClick: () => source && duplicateInbound(source, resetRowSelection),
      disabled: !canDuplicate,
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
