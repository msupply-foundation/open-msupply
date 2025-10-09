import React, { memo, useState } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useNotification,
  useConfirmationModal,
  AlertModal,
} from '@openmsupply-client/common';
import { DeleteError, LocationRowFragment, useLocation } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: LocationRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const {
    delete: { delete: deleteLocation },
  } = useLocation();

  const { error, success } = useNotification();
  const [deleteErrors, setDeleteErrors] = useState<DeleteError[]>([]);

  const deleteAction = async () => {
    if (selectedRows) {
      try {
        const result = await deleteLocation(selectedRows);
        if (result) {
          setDeleteErrors(result);
        }
        if (result.length === 0) {
          success(
            t('messages.deleted-locations', {
              count: selectedRows.length,
            })
          )();
          resetRowSelection();
        }
      } catch (err) {
        error(
          t('messages.error-deleting-locations', { count: selectedRows.length })
        )();
      }
    }
  };

  const showDeleteConfirmation = useConfirmationModal({
    onConfirm: deleteAction,
    message: t('messages.confirm-delete-locations', {
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
          {selectedRows.length > 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={resetRowSelection}
            />
          )}
          {deleteErrors.length > 0 && (
            <AlertModal
              message={
                <ul>
                  {deleteErrors.map(({ locationName, message }) => (
                    <li key={locationName}>
                      {locationName}: {message}
                    </li>
                  ))}
                </ul>
              }
              title={t('messages.error-deleting-locations', {
                count: deleteErrors.length,
              })}
              open
              onOk={() => setDeleteErrors([])}
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
