import {
  ArrayUtils,
  CellProps,
  BasicCellLayout,
  RecordWithId,
} from '@openmsupply-client/common';
import { usePackVariant } from '../../context';
import React from 'react';

// Shows '[multiple]' if there is more then one pack size
// otherwise shows pack size or unit variant short name
export const PackVariantCell =
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
    const { asPackVariant } = usePackVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );

    const packSizes = ArrayUtils.dedup(getPackSizes(rowData));

    const displayValue =
      packSizes.length > 1 ? '[muiltiple]' : asPackVariant(packSizes[0] ?? 1);

    // Must have only one packSize
    return <BasicCellLayout isError={isError}>{displayValue}</BasicCellLayout>;
  };
