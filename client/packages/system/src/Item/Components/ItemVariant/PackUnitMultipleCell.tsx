import {
  ArrayUtils,
  CellProps,
  InnerBasicCell,
  RecordWithId,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';
import React from 'react';

// Shows '[multiple]' if there is more then one pack size
// otherwise shows pack size or unit variant short name
export const PackUnitMultipleCell =
  <T extends RecordWithId>({
    getItemId,
    getUnitName,
    getPackSizes,
  }: {
    getItemId: (row: T) => string;
    getPackSizes: (row: T) => number[];
    getUnitName: (row: T) => string | null;
  }) =>
  ({ isError, rowData }: CellProps<T>) => {
    const { asPackUnit } = useUnitVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );

    const packSizes = ArrayUtils.dedup(getPackSizes(rowData));

    const displayValue =
      packSizes.length > 1 ? '[muiltiple]' : asPackUnit(packSizes[0] ?? 1);

    // Must have only one packSize
    return <InnerBasicCell isError={isError} value={displayValue} />;
  };
