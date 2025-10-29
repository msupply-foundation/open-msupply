import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useMutation,
  useQueryClient,
  InvoiceNodeStatus,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { InboundRowFragment } from '../api';
import { useInboundApi } from '../api/hooks/utils/useInboundApi';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: InboundRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const queryClient = useQueryClient();
  const api = useInboundApi();
  const { mutateAsync } = useMutation(api.delete);

  const deleteAction = async () => {
    await mutateAsync(selectedRows)
      .then(() => queryClient.invalidateQueries(api.keys.base()))
      .catch(err => {
        throw err;
      });
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(
      ({ status }) => status === InvoiceNodeStatus.New
    ),
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
