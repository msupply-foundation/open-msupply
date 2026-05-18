import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
import { ResponseFragment, useResponse } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: ResponseFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();

  const { confirmAndDelete } = useResponse.document.deleteSelected(
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
