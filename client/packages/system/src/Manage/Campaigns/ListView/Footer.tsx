import React, { FC, memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';

interface FooterProps {
  selectedRowCount: number;
  deleteRows: () => void;
  resetRowSelection: () => void;
}

export const FooterComponent: FC<FooterProps> = ({
  selectedRowCount,
  deleteRows,
  resetRowSelection,
}) => {
  const t = useTranslation();

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: deleteRows,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRowCount > 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRowCount}
              resetRowSelection={resetRowSelection}
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
