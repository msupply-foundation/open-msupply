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
  mapInboundDeleteError,
} from '../api';
import { canDeleteInbound } from '../../utils';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
  setFailedDeleteIds,
}: {
  selectedRows: InboundRowFragment[];
  resetRowSelection: () => void;
  setFailedDeleteIds: (ids: string[]) => void;
}) => {
  const t = useTranslation();

  const {
    delete: { deleteInbounds },
  } = useInboundList();
  const { duplicateInbound, hasMutatePermission } = useDuplicateInbound();

  const deleteAction = async () => {
    setFailedDeleteIds([]);
    const nodes = await deleteInbounds(selectedRows);

    const failedIds: string[] = [];
    const messages: string[] = [];
    nodes.forEach(node => {
      const errMessage = mapInboundDeleteError(node, t);
      if (errMessage) {
        failedIds.push(node.id);
        messages.push(errMessage);
      }
    });
    setFailedDeleteIds(failedIds);

    if (messages.length > 0) {
      throw new Error(Array.from(new Set(messages)).join('\n'));
    }
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
      cantDelete: err => err.message,
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
