import { MRT_RowData } from 'material-react-table';
import { Row } from '@tanstack/table-core';

export const multipleKeys = '[multiple]';

export const defaultAggregationFn = <T extends MRT_RowData>(
  columnId: string,
  _leafRows: Row<T>[],
  childRows: Row<T>[]
) => {
  // if all child rows have the same value, return that value, otherwise return '[multiple]'
  const firstValue = childRows[0]?.getValue(columnId);
  if (childRows.every(row => row.getValue(columnId) === firstValue)) {
    return firstValue;
  }
  return multipleKeys;
};

export const weightedAverage = <
  T extends MRT_RowData & { packSize?: number; numberOfPacks?: number },
>(
  columnId: string,
  _leafRows: Row<T>[],
  childRows: Row<T>[]
) => {
  // calculate the average weighted by total quantity of each row
  const weights = childRows.map(row => {
    return {
      weight: (row.original.packSize ?? 0) * (row.original.numberOfPacks ?? 0),
      value: row.getValue<number>(columnId) ?? 0,
    };
  });
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight === 0) return 0;
  return weights.reduce((sum, w) => sum + w.value * w.weight, 0) / totalWeight;
};
