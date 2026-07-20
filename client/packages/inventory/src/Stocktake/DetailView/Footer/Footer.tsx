import React, { ReactElement } from 'react';
import {
  Box,
  StatusCrumbs,
  useTranslation,
  AppFooterPortal,
  StocktakeNodeStatus,
  ArrowRightIcon,
  RewindIcon,
  Action,
  DeleteIcon,
  useEditModal,
  ActionsFooter,
  useNotification,
} from '@openmsupply-client/common';
import { stocktakeStatuses, getStatusTranslation } from '../../../utils';
import {
  StocktakeFragment,
  StocktakeLineFragment,
  useStocktakeOld,
} from '../../api';
import { StatusChangeButton } from './StatusChangeButton';
import { StocktakeLockButton } from './StocktakeLockButton';
import { ReduceLinesToZeroConfirmationModal } from '../ReduceLinesToZeroModal';
import { ChangeLocationConfirmationModal } from '../ChangeLocationModal';

const createStatusLog = (stocktake: StocktakeFragment) => {
  return {
    [StocktakeNodeStatus.New]: stocktake.createdDatetime,
    [StocktakeNodeStatus.Finalised]: stocktake.finalisedDatetime,
  };
};

/**
 * Status crumbs + lock/status-change buttons. Extracted so the parent
 * `DetailView` can render it through `AppFooterStatusPortal` on every tab —
 * the lines table's own `Footer` only takes over to show row-selection
 * actions.
 */
export const StatusFooter = (): ReactElement | null => {
  const t = useTranslation();
  const { data: stocktake } = useStocktakeOld.document.get();

  if (!stocktake) return null;

  return (
    <Box
      gap={2}
      display="flex"
      flexDirection="row"
      alignItems="center"
      height={64}
    >
      <StocktakeLockButton />
      <StatusCrumbs
        statuses={stocktakeStatuses}
        statusLog={createStatusLog(stocktake)}
        statusFormatter={status => t(getStatusTranslation(status))}
      />

      <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
        <StatusChangeButton />
      </Box>
    </Box>
  );
};

export const Footer = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: StocktakeLineFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const isDisabled = useStocktakeOld.utils.isDisabled();
  const onDelete = useStocktakeOld.line.deleteSelected(
    selectedRows,
    resetRowSelection
  );
  const { info } = useNotification();

  const reduceModal = useEditModal();
  const changeLocationModal = useEditModal();

  const handleChangeLocationClick = () => {
    !!isDisabled
      ? info(t('label.cant-change-location'))()
      : changeLocationModal.onOpen();
  };

  const handleReduceLinesClick = () => {
    !!isDisabled
      ? info(t('label.cant-zero-stock-lines-disabled'))()
      : reduceModal.onOpen();
  };

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
      testId: 'delete-lines-button',
    },
    {
      label: t('button.change-location'),
      icon: <ArrowRightIcon />,
      onClick: handleChangeLocationClick,
      shouldShrink: false,
      testId: 'change-location-button',
    },
    {
      label: t('button.reduce-lines-to-zero'),
      icon: <RewindIcon />,
      onClick: handleReduceLinesClick,
      shouldShrink: false,
      testId: 'reduce-lines-to-zero-button',
    },
  ];

  // Only mount the footer portal when there's a selection. Otherwise leave the
  // slot free so the parent `AppFooterStatusPortal` (status crumbs) shows
  // through on every tab. The confirmation modals are opened from row actions
  // but render via their own portals, so they stay mounted outside the
  // conditional.
  return (
    <>
      {selectedRows.length !== 0 && (
        <AppFooterPortal
          Content={
            <ActionsFooter
              actions={actions}
              selectedRowCount={selectedRows.length}
              resetRowSelection={resetRowSelection}
            />
          }
        />
      )}
      {reduceModal.isOpen && (
        <ReduceLinesToZeroConfirmationModal
          isOpen={reduceModal.isOpen}
          onCancel={reduceModal.onClose}
          clearSelected={resetRowSelection}
          selectedRows={selectedRows}
        />
      )}
      {changeLocationModal.isOpen && (
        <ChangeLocationConfirmationModal
          isOpen={changeLocationModal.isOpen}
          onCancel={changeLocationModal.onClose}
          clearSelected={resetRowSelection}
          rows={selectedRows}
        />
      )}
    </>
  );
};
