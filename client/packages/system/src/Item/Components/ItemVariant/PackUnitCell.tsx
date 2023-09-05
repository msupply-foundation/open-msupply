import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  InnerBasicCell,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';

// Adjust pack size
export const getPackUnitCell =
  <T extends RecordWithId>({
    getItemId,
    getPackSize,
    getUnitName,
  }: {
    getItemId: (row: T) => string;
    getPackSize: (row: T) => number;
    getUnitName: (row: T) => string | undefined;
  }) =>
  ({ isError, rowData }: CellProps<T>): ReactElement => {
    const { asPackUnit } = useUnitVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );

    const packSize = getPackSize(rowData);
    const packUnit = asPackUnit(packSize);

    return <InnerBasicCell isError={isError} value={packUnit} />;
  };
