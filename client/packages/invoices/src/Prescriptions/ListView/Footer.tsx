import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { PrescriptionRowFragment, usePrescriptionList } from '../api';
import { canDeletePrescription } from '../../utils';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: PrescriptionRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();

  const {
    delete: { deletePrescriptions },
  } = usePrescriptionList();

  const deleteAction = async () => {
    await deletePrescriptions(selectedRows);
    resetRowSelection();
  };

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction,
    canDelete: selectedRows.every(canDeletePrescription),
    messages: {
      confirmMessage: t('messages.confirm-delete-prescriptions', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-prescriptions', {
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
