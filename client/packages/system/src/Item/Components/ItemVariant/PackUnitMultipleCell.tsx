import {
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

    const packSizes = getPackSizes(rowData);

    const packUnit =
      packSizes.length > 1 ? '[multiple]' : asPackUnit(packSizes[0] ?? 0);

    return <InnerBasicCell isError={isError} value={packUnit} />;
  };
