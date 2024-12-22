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
  useNotification,
  ActionsFooter,
} from '@openmsupply-client/common';
import { stocktakeStatuses, getStocktakeTranslator } from '../../../utils';
import { StocktakeFragment, useStocktake } from '../../api';
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

export const Footer = () => {
  const t = useTranslation();
  const { info } = useNotification();
  const { data: stocktake } = useStocktake.document.get();
  const isDisabled = useStocktake.utils.isDisabled();
  const onDelete = useStocktake.line.deleteSelected();

  const reduceModal = useEditModal();
  const changeLocationModal = useEditModal();

  const selectedRows = useStocktake.utils.selectedRows();
  console.log(selectedRows);

  // Is this check needed now that actions only appear when lines are selected?
  const checkSelected = () => {
    if (!selectedRows.length) {
      const selectRowsSnack = info(t('messages.no-lines-selected'));
      selectRowsSnack();
      return;
    }
    if (isDisabled) {
      const isLockedSnack = info(t('error.is-locked'));
      isLockedSnack();
      return;
    }
    return true;
  };

  const openReduceToZeroModal = () => {
    if (checkSelected()) reduceModal.onOpen();
  };

  const openChangeLocationModal = () => {
    if (checkSelected()) changeLocationModal.onOpen();
  };

  const actions: Action[] = [
    {
      label: t('button.change-location'),
      icon: <ArrowRightIcon />,
      onClick: openChangeLocationModal,
      disabled: isDisabled,
    },
    {
      label: t('button.reduce-lines-to-zero'),
      icon: <RewindIcon />,
      onClick: openReduceToZeroModal,
    },
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: onDelete,
      disabled: isDisabled,
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
                />
              }
              {reduceModal.isOpen && (
                <ReduceLinesToZeroConfirmationModal
                  isOpen={reduceModal.isOpen}
                  onCancel={reduceModal.onClose}
                />
              )}
              {changeLocationModal.isOpen && (
                <ChangeLocationConfirmationModal
                  isOpen={changeLocationModal.isOpen}
                  onCancel={changeLocationModal.onClose}
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
                statusFormatter={getStocktakeTranslator(t)}
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
