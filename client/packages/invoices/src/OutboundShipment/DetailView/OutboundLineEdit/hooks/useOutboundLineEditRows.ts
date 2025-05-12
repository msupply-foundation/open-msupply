import { useEffect, useMemo } from 'react';
import { useTableStore, SortUtils } from '@openmsupply-client/common';
import { DraftStockOutLine } from '../../../../types';
import { isA } from '../../../../utils';
import { DraftOutboundLineFragment } from '../../../api/operations.generated';

export const useOutboundLineEditRows = (
  rows: DraftOutboundLineFragment[],
  scannedBatch?: string
) => {
  const tableStore = useTableStore();

  const {
    allocatableRows,
    onHoldRows,
    noStockRows,
    placeholderRow,
    scannedBatchMismatchRows,
  } = useMemo(() => {
    const placeholderRow = rows.find(isA.placeholderLine);

    const rowsIncludeScannedBatch =
      !!scannedBatch &&
      rows.some(
        row => row.batch === scannedBatch && !isOnHold(row) && !hasNoStock(row)
      );

    const rowsWithoutPlaceholder = rows
      .filter(line => !isA.placeholderLine(line))
      .sort(SortUtils.byExpiryAsc);

    const allocatableRows: DraftStockOutLine[] = [];
    const onHoldRows: DraftStockOutLine[] = [];
    const noStockRows: DraftStockOutLine[] = [];
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
      scannedBatchMismatchRows,
      placeholderRow,
    };
  }, [rows]);

  const orderedRows = useMemo(() => {
    return [
      ...allocatableRows,
      ...scannedBatchMismatchRows,
      ...onHoldRows,
      ...noStockRows,
    ];
  }, [allocatableRows, onHoldRows, noStockRows]);

  const disabledRows = useMemo(() => {
    return [...onHoldRows, ...noStockRows, ...scannedBatchMismatchRows];
  }, [, onHoldRows, noStockRows, scannedBatchMismatchRows]);

  useEffect(() => {
    tableStore.setDisabledRows(disabledRows.map(({ id }) => id));
  }, [disabledRows]);

  return {
    orderedRows,
    disabledRows,
    allocatableRows,
    onHoldRows,
    noStockRows,
    placeholderRow,
    scannedBatchMismatchRows,
  };
};

const isOnHold = (row: DraftOutboundLineFragment) =>
  !!row.stockLineOnHold || !!row.location?.onHold;

const hasNoStock = (row: DraftOutboundLineFragment) => row.availablePacks === 0;
