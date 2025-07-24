import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useTableStore,
  useDeleteConfirmation,
  RnRFormNodeStatus,
} from '@openmsupply-client/common';
import { useDeleteRnRForm } from '../api/hooks/useDeleteRnRForm';
import { RnRFormFragment } from '../api';

export const FooterComponent = ({
  rnrForms,
}: {
  rnrForms?: RnRFormFragment[];
}) => {
  const t = useTranslation();
  const { deleteRnRForms } = useDeleteRnRForm();

  const { selectedRows } = useTableStore(state => ({
    selectedRows: Object.keys(state.rowState)
      .filter(id => state.rowState[id]?.isSelected)
      .map(selectedId => rnrForms?.find(({ id }) => selectedId === id))
      .filter(Boolean) as RnRFormFragment[],
  }));

  const deleteAction = async () => {
    if (selectedRows.length > 0) {
      await deleteRnRForms(selectedRows.map(({ id }) => id)).catch(err => {
        throw err;
      });
    }
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
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
