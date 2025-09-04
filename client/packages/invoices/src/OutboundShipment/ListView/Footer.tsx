import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useFeatureFlags,
} from '@openmsupply-client/common';
import { OutboundRowFragment, useOutbound } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: OutboundRowFragment[];
  resetRowSelection: () => void;
}) => {
  const { tableUsabilityImprovements } = useFeatureFlags();
  const t = useTranslation();

  const { confirmAndDelete, selectedRows: oldSelectedRows } =
    useOutbound.document.deleteRows(selectedRows, resetRowSelection);

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
  ];

  const actualSelectedRows = tableUsabilityImprovements
    ? selectedRows
    : oldSelectedRows;

  return (
    <AppFooterPortal
      Content={
        <>
          {actualSelectedRows.length !== 0 && (
            <ActionsFooter
              actions={actions}
              selectedRowCount={actualSelectedRows.length}
            />
          )}
        </>
      }
    />
  );
};

export const Footer = memo(FooterComponent);
