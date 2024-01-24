import { useEffect, useMemo } from 'react';
import { useTableStore, SortUtils } from '@openmsupply-client/common';
import { isA } from '../../../../utils';
import { DraftStockOutLine } from '../../../../types';
import { PackSizeController } from '../../../../StockOut';

export const usePrescriptionLineEditRows = (
  rows: DraftStockOutLine[],
  packSizeController: PackSizeController
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
  } = useMemo(() => {
    const placeholderRow = rows.find(isA.placeholderLine);
    const isRequestedPackSize = (packSize: number) =>
      packSizeController.selected?.value === -1 ||
      packSize === packSizeController.selected?.value;

    const rowsWithoutPlaceholder = rows
      .filter(line => !isA.placeholderLine(line))
      .sort(SortUtils.byExpiryAsc);

    const allocatableRows: DraftStockOutLine[] = [];
    const onHoldRows: DraftStockOutLine[] = [];
    const noStockRows: DraftStockOutLine[] = [];
    const wrongPackSizeRows: DraftStockOutLine[] = [];

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

      allocatableRows.push(row);
    });

    return {
      allocatableRows,
      onHoldRows,
      noStockRows,
      wrongPackSizeRows,
      placeholderRow,
    };
  }, [rows, packSizeController.selected?.value]);

  const orderedRows = useMemo(() => {
    return [
      ...allocatableRows,
      ...wrongPackSizeRows,
      ...onHoldRows,
      ...noStockRows,
    ];
  }, [allocatableRows, wrongPackSizeRows, onHoldRows, noStockRows]);

  const disabledRows = useMemo(() => {
    return [...wrongPackSizeRows, ...onHoldRows, ...noStockRows];
  }, [wrongPackSizeRows, onHoldRows, noStockRows]);

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
  };
};
