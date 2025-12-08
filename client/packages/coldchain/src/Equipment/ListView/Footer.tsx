import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  UserPermission,
  useAuthContext,
  useNotification,
} from '@openmsupply-client/common';
import { AssetRowFragment, useAssets } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: AssetRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { info } = useNotification();
  const { userHasPermission } = useAuthContext();

  const { confirmAndDelete } = useAssets.document.deleteAssets(
    selectedRows,
    resetRowSelection
  );

  const handleDelete = () => {
    if (!userHasPermission(UserPermission.AssetMutate)) {
      info(t('error.no-asset-delete-permission'))();
      return;
    }
    confirmAndDelete();
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: handleDelete,
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
