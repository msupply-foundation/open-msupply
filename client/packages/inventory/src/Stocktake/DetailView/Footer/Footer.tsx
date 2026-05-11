import React from 'react';
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

export const Footer = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: StocktakeLineFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { data: stocktake } = useStocktakeOld.document.get();
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
    },
    {
      label: t('button.change-location'),
      icon: <ArrowRightIcon />,
      onClick: handleChangeLocationClick,
      shouldShrink: false,
    },
    {
      label: t('button.reduce-lines-to-zero'),
      icon: <RewindIcon />,
      onClick: handleReduceLinesClick,
      shouldShrink: false,
    },
  ];

  return (
    <AppFooterPortal
      Content={
        <>
          {selectedRows.length !== 0 && (
            <>
              {
                <ActionsFooter
                  actions={actions}
                  selectedRowCount={selectedRows.length}
                  resetRowSelection={resetRowSelection}
                />
              }
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
          )}
          {stocktake && selectedRows.length === 0 && (
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
          )}
        </>
      }
    />
  );
};
