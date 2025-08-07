import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
import { ListParams, useGoodsReceivedList } from '../api'; // To be implemented

export const FooterComponent: FC<{ listParams: ListParams }> = ({
  listParams,
}) => {
  const t = useTranslation();
  const { selectedRows } = useGoodsReceivedList(listParams);

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: () => {
        // eslint-disable-next-line
        alert('TO-DO: Delete goods received...');
      },
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
