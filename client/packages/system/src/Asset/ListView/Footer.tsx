import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useIsCentralServerApi,
} from '@openmsupply-client/common';
import { useAssetData } from '../api/hooks';

export const FooterComponent: FC = () => {
  const t = useTranslation();
  const isCentralServer = useIsCentralServerApi();

  const { selectedRows, confirmAndDelete } = useAssetData.document.delete();

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
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
