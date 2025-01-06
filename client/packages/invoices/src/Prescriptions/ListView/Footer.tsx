import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { ListParams, usePrescriptionList } from '../api';
import { canDeletePrescription } from '../../utils';

export const FooterComponent: FC<{ listParams: ListParams }> = ({
  listParams,
}) => {
  const t = useTranslation();

  const {
    delete: { deletePrescriptions },
    selectedRows,
  } = usePrescriptionList(listParams);

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: deletePrescriptions,
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
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
