import { useEffect, useMemo } from 'react';
import { useTableStore, SortUtils } from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../../types';
import { isA } from '../../../../utils';
import { PackSizeController } from '../../../../StockOut';

export const useOutboundLineEditRows = (
  rows: DraftStockOutLine[],
  packSizeController: PackSizeController,
  scannedBatch?: string
) => {
  const tableStore = useTableStore();

  const isOnHold = (row: DraftStockOutLine) =>
    !!row.stockLine?.onHold || !!row.location?.onHold;
  const hasNoStock = (row: DraftStockOutLine) =>
    row.stockLine?.availableNumberOfPacks === 0;

  const {
    allocatableRows,
    wrongPackSizeRows,
    onHoldRows,
    noStockRows,
    placeholderRow,
    scannedBatchMismatchRows,
  } = useMemo(() => {
    const placeholderRow = rows.find(isA.placeholderLine);
    const isRequestedPackSize = (packSize: number) =>
      packSizeController.selected?.value === -1 ||
      packSize === packSizeController.selected?.value;

    const rowsIncludeScannedBatch =
      !!scannedBatch &&
      rows.some(
        row =>
          row.stockLine?.batch === scannedBatch &&
          !isOnHold(row) &&
          !hasNoStock(row) &&
          isRequestedPackSize(row.packSize)
      );

    const rowsWithoutPlaceholder = rows
      .filter(line => !isA.placeholderLine(line))
      .sort(SortUtils.byExpiryAsc);

    const allocatableRows: DraftStockOutLine[] = [];
    const onHoldRows: DraftStockOutLine[] = [];
    const noStockRows: DraftStockOutLine[] = [];
    const wrongPackSizeRows: DraftStockOutLine[] = [];
    const scannedBatchMismatchRows: DraftStockOutLine[] = [];

    rowsWithoutPlaceholder.forEach(row => {
      if (isOnHold(row)) {
        onHoldRows.push(row);
        return;
      }

      if (hasNoStock(row)) {
        noStockRows.push(row);
        return;
      }

      if (!isRequestedPackSize(row.packSize)) {
        wrongPackSizeRows.push(row);
        return;
      }

      if (rowsIncludeScannedBatch && row.stockLine?.batch !== scannedBatch) {
        scannedBatchMismatchRows.push(row);
        return;
      }

      allocatableRows.push(row);
    });

    return {
      allocatableRows,
      onHoldRows,
      noStockRows,
      wrongPackSizeRows,
      scannedBatchMismatchRows,
      placeholderRow,
    };
  }, [rows, packSizeController.selected?.value]);

  const orderedRows = useMemo(() => {
    return [
      ...allocatableRows,
      ...scannedBatchMismatchRows,
      ...wrongPackSizeRows,
      ...onHoldRows,
      ...noStockRows,
    ];
  }, [allocatableRows, wrongPackSizeRows, onHoldRows, noStockRows]);

  const disabledRows = useMemo(() => {
    return [
      ...wrongPackSizeRows,
      ...onHoldRows,
      ...noStockRows,
      ...scannedBatchMismatchRows,
    ];
  }, [wrongPackSizeRows, onHoldRows, noStockRows, scannedBatchMismatchRows]);

  useEffect(() => {
    tableStore.setDisabledRows(disabledRows.map(({ id }) => id));
  }, [disabledRows]);

  return {
    orderedRows,
    disabledRows,
    allocatableRows,
    onHoldRows,
    noStockRows,
    wrongPackSizeRows,
    placeholderRow,
    scannedBatchMismatchRows,
  };
};
