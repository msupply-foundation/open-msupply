import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
import { useRequest } from '../api';

export const FooterComponent: FC = () => {
  const t = useTranslation();

  const { selectedRows, ...onDelete } = useRequest.document.deleteSelected();
  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete.confirmAndDelete,
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
