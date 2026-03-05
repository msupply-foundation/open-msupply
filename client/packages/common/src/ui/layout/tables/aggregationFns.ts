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

export const weightedAverageByUnits = <
  T extends MRT_RowData & { packSize?: number; numberOfPacks?: number },
>() => {
  return weightedAverage<T>(row => {
    const packSize = row.original.packSize ?? 0;
    const numberOfPacks = row.original.numberOfPacks ?? 0;
    return packSize * numberOfPacks;
  });
};

export const weightedAverageByPacks = <
  T extends MRT_RowData & { numberOfPacks?: number },
>() => {
  return weightedAverage<T>(row => row.original.numberOfPacks ?? 0);
};

export const weightedAverage =
  <T extends MRT_RowData>(getWeight: (row: Row<T>) => number) =>
  (columnId: string, _leafRows: Row<T>[], childRows: Row<T>[]) => {
    const weights = childRows.map(row => {
      return {
        weight: getWeight(row),
        value: row.getValue<number>(columnId) ?? 0,
      };
    });
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    if (totalWeight === 0) return 0;
    return (
      weights.reduce((sum, w) => sum + w.value * w.weight, 0) / totalWeight
    );
  };
