import { useEffect, useMemo } from 'react';
import { useTableStore, SortUtils } from '@openmsupply-client/common';
import { isA } from '../../../../utils';
import { DraftStockOutLine } from '../../../../types';

export const usePrescriptionLineEditRows = (
  rows: DraftStockOutLine[],
  isDisabled: boolean
) => {
  const tableStore = useTableStore();

  const isOnHold = (row: DraftStockOutLine) =>
    !!row.stockLine?.onHold || !!row.location?.onHold;
  const hasNoStock = (row: DraftStockOutLine) =>
    row.stockLine?.availableNumberOfPacks === 0;

  const { allocatableRows, wrongPackSizeRows, onHoldRows, noStockRows } =
    useMemo(() => {
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

        allocatableRows.push(row);
      });

      return {
        allocatableRows,
        onHoldRows,
        noStockRows,
        wrongPackSizeRows,
      };
    }, [rows]);

  const orderedRows = useMemo(() => {
    return [
      ...allocatableRows,
      ...wrongPackSizeRows,
      ...onHoldRows,
      ...noStockRows,
    ];
  }, [allocatableRows, wrongPackSizeRows, onHoldRows, noStockRows]);

  const disabledRows = useMemo(() => {
    if (isDisabled) return orderedRows;
    return [...wrongPackSizeRows, ...onHoldRows, ...noStockRows];
  }, [wrongPackSizeRows, onHoldRows, noStockRows, isDisabled]);

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
  };
};
