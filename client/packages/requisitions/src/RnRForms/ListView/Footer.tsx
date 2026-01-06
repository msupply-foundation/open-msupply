import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
  RnRFormNodeStatus,
} from '@openmsupply-client/common';
import { useDeleteRnRForm } from '../api/hooks/useDeleteRnRForm';
import { RnRFormFragment } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: RnRFormFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { deleteRnRForms } = useDeleteRnRForm();

  const deleteAction = async () => {
    if (selectedRows.length > 0) {
      await deleteRnRForms(selectedRows.map(({ id }) => id)).catch(err => {
        throw err;
      });
    }
    resetRowSelection();
  };
  const showDeleteConfirmation = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(
      ({ status }) => status === RnRFormNodeStatus.Draft
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-rnr-forms', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-rnr-form', {
        count: selectedRows.length,
      }),
      cantDelete: t('messages.cannot-delete-rnr-form'),
    },
  });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: showDeleteConfirmation,
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
