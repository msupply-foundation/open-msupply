import React, { memo } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
} from '@openmsupply-client/common';
import { useStocktakeList } from '../api/hooks/useStocktakeList';
import { canDeleteStocktake } from '../../utils';
import { StocktakeRowFragment } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetSelection,
}: {
  selectedRows: StocktakeRowFragment[];
  resetSelection: () => void;
}) => {
  const t = useTranslation();
  const {
    delete: { deleteStocktakes },
  } = useStocktakeList();

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      await deleteStocktakes(selectedRows);
      resetSelection();
    },
    canDelete: selectedRows.every(canDeleteStocktake),
    messages: {
      confirmMessage: t('messages.confirm-delete-stocktakes', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-stocktakes', {
        count: selectedRows.length,
      }),
      cantDelete: selectedRows.every(item => item.isLocked)
        ? t('messages.cannot-delete-stocktake-on-hold')
        : t('label.cant-delete-disabled'),
    },
  });

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
              resetRowSelection={resetSelection}
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
