import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useConfirmationModal,
  useTableStore,
} from '@openmsupply-client/common';
import { useDeleteRnRForm } from '../api/hooks/useDeleteRnRForm';
import { RnRFormFragment } from '../api';

export const FooterComponent = () => {
  const t = useTranslation();
  const { deleteRnRForms } = useDeleteRnRForm();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => selectedId),
  }));

  const deleteAction = async () => {
    if (selectedRows.length > 0) {
      try {
        await deleteRnRForms(selectedRows);
      } catch (err) {
        console.error(err);
      }
    }
  };
  const showDeleteConfirmation = useConfirmationModal({
    onConfirm: deleteAction,
    message: t('messages.confirm-delete-rnr-forms', {
      count: selectedRows.length,
    }),
    title: t('heading.are-you-sure'),
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
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
