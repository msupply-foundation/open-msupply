import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  CopyIcon,
  useTranslation,
  AppFooterPortal,
} from '@openmsupply-client/common';
import { OutboundRowFragment, useOutbound, useDuplicateOutbound } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: OutboundRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();

  const { confirmAndDelete } = useOutbound.document.deleteRows(
    selectedRows,
    resetRowSelection
  );
  const { duplicateOutbound, hasMutatePermission } = useDuplicateOutbound();

  const source = selectedRows[0];
  const onlyOneSelected = selectedRows.length === 1;
  const canDuplicate = onlyOneSelected && !!source && hasMutatePermission;

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
      testId: 'delete-lines-button',
    },
    {
      label: t('button.make-a-copy'),
      icon: <CopyIcon />,
      onClick: () => source && duplicateOutbound(source, resetRowSelection),
      disabled: !canDuplicate,
      tooltip: onlyOneSelected
        ? undefined
        : t('messages.select-single-shipment-to-copy'),
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
