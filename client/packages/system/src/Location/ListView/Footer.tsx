import React, { memo } from 'react';
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

export const FooterComponent = ({ data }: { data: LocationRowFragment[] }) => {
  const t = useTranslation();
  const {
    delete: { delete: deleteLocation, selectedRows },
  } = useLocation(data);

  const { error, success } = useNotification();
  const [deleteErrors, setDeleteErrors] = React.useState<DeleteError[]>([]);

  const deleteAction = async () => {
    if (selectedRows) {
      try {
        const result = await deleteLocation();
        if (result) {
          setDeleteErrors(result);
        }
        if (deleteErrors.length === 0) {
          success(
            t('messages.deleted-locations', {
              count: selectedRows.length,
            })
          )();
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
