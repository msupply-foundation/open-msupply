import React, { ReactElement } from 'react';
import {
  RecordWithId,
  CellProps,
  BasicCellLayout,
} from '@openmsupply-client/common';
import { usePackVariant } from '../../context';
import { PackVariantSelect } from './PackVariantSelect';

// Drop down selector for unit variant
export const PackVariantSelectCell =
  <T extends RecordWithId>({
    getItemId,
    getUnitName,
  }: {
    getItemId: (row: T) => string;
    getUnitName: (row: T) => string | null;
  }) =>
  ({ isError, rowData }: CellProps<T>): ReactElement => {
    const { asPackVariant, variantsControl } = usePackVariant(
      getItemId(rowData),
      getUnitName(rowData)
    );

    if (!variantsControl) {
      // If no variants exist, then use number of packs = 1
      return (
        <BasicCellLayout isError={isError}>{asPackVariant(1)}</BasicCellLayout>
      );
    }

    return <PackVariantSelect variantControl={variantsControl} />;
  };
