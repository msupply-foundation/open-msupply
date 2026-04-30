import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
import { RequestRowFragment, useRequest } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: RequestRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();

  const { confirmAndDelete } = useRequest.document.deleteSelected(
    selectedRows,
    resetRowSelection
  );

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
              resetRowSelection={resetRowSelection}
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
