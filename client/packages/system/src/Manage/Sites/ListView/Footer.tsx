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
import { SiteRowFragment } from '../api';

type DeleteError = {
  siteName: string;
  message: string;
};

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
  deleteSite,
}: {
  selectedRows: SiteRowFragment[];
  resetRowSelection: () => void;
  deleteSite: (siteId: number) => Promise<unknown>;
}) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const [deleteErrors, setDeleteErrors] = useState<DeleteError[]>([]);

  const deleteAction = async () => {
    if (selectedRows) {
      const errors: DeleteError[] = [];
      await Promise.all(
        selectedRows.map(async row => {
          try {
            await deleteSite(row.id);
          } catch (e) {
            errors.push({
              siteName: row.name,
              message: String(e),
            });
          }
        })
      );
      setDeleteErrors(errors);
      if (errors.length === 0) {
        success(
          t('messages.deleted-sites', {
            count: selectedRows.length,
          })
        )();
        resetRowSelection();
      }
    }
  };

  const showDeleteConfirmation = useConfirmationModal({
    onConfirm: deleteAction,
    message: t('messages.confirm-delete-sites', {
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
                  {deleteErrors.map(({ siteName, message }) => (
                    <li key={siteName}>
                      {siteName}: {message}
                    </li>
                  ))}
                </ul>
              }
              title={t('error.unable-to-delete-site')}
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
