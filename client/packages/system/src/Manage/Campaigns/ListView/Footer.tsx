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
}

export const FooterComponent: FC<FooterProps> = ({
  selectedRowCount,
  deleteRows,
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
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
