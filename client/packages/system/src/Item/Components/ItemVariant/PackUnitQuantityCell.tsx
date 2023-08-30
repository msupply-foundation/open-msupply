import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  InnerBasicCell,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';

// Adjust pack size
export const getPackUnitQuantityCell =
  <T extends RecordWithId>({
    getItemId,
    getQuantity,
  }: {
    getItemId: (row: T) => string;
    getQuantity: (row: T) => number;
  }) =>
  ({ isError, rowData }: CellProps<T>): ReactElement => {
    const { numberOfPacksFromQuantity } = useUnitVariant(getItemId(rowData));

    const quantity = getQuantity(rowData);
    const packQuantity = numberOfPacksFromQuantity(quantity);

    return <InnerBasicCell isError={isError} value={String(packQuantity)} />;
  };
