import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useIsCentralServerApi,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useAssetDelete } from '../api/hooks';
import { AssetCatalogueItemFragment } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: AssetCatalogueItemFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  const { deleteAssets } = useAssetDelete();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      deleteAssets(selectedRows);
      resetRowSelection();
    },
    messages: {
      confirmMessage: t('messages.confirm-delete-assets', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-assets', {
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
          {selectedRows.length !== 0 && isCentralServer && (
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
