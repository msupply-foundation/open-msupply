import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
import { MRT_Row as MRTRow } from 'material-react-table';
import { OutboundRowFragment, useOutbound } from '../api';

export const FooterComponent = ({
  selectedRows,
}: {
  selectedRows: MRTRow<OutboundRowFragment>[];
}) => {
  const t = useTranslation();

  const { confirmAndDelete } = useOutbound.document.deleteRows();

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
