import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
// import { ListParams, useGoodsReceivedList } from '../api'; // To be implemented

// Placeholder for list params and hook
type ListParams = any;
const useGoodsReceivedList = (listParams: ListParams) => ({ selectedRows: [] });

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
        console.log('TO-DO: Delete goods received...');
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
