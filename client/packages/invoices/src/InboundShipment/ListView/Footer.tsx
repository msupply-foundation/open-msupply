import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
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

  const {
    delete: { deleteInbounds },
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

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
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
