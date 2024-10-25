import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  BasicCellLayout,
} from '@openmsupply-client/common';

// We don't have pack variants here currently, so we just display the unit name
export const PackSizeUnitNameCell =
  <T extends RecordWithId>({
    getUnitName,
  }: {
    getUnitName: (row: T) => string | null;
  }) =>
  ({ isError, rowData }: CellProps<T>): ReactElement => {
    let unitName = getUnitName(rowData);
    return <BasicCellLayout isError={isError}>{unitName}</BasicCellLayout>;
  };
