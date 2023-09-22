import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  InnerBasicCell,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';
import { PackUnitSelect } from './PackUnitSelect';

// Drop down selector for unit variant
export const getPackUnitSelectCell =
  <T extends RecordWithId>({
    getItemId,
    getUnitName,
  }: {
    getItemId: (row: T) => string;
    getUnitName: (row: T) => string | null;
  }) =>
  ({ isError, rowData }: CellProps<T>): ReactElement => {
    const { asPackUnit, variantsControl } = useUnitVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );

    if (!variantsControl) {
      // If no variants exist, then use number of packs = 1
      return <InnerBasicCell isError={isError} value={asPackUnit(1)} />;
    }

    return <PackUnitSelect variantControl={variantsControl} />;
  };
