import {
  CellProps,
  ArrayUtils,
  InnerBasicCell,
} from '@openmsupply-client/common';
import { useUnitVariant } from '../../context';
import { ItemRowFragment } from '../../api';
import React from 'react';

export interface PackUnitMultipleCellProps<T> {
  id: string;
  item?: ItemRowFragment | null;
  lines?: T[];
}

export const PackUnitMultipleCell =
  <
    L extends { packSize?: number | null; item?: ItemRowFragment | null },
    T extends PackUnitMultipleCellProps<L>,
  >({
    getItemId,
    getPackSize,
    getUnitName,
  }: {
    getItemId: (row: T) => string;
    getPackSize: (row: T) => number;
    getUnitName: (row: T) => string | null;
  }) =>
  ({ isError, rowData }: CellProps<T>) => {
    if ('lines' in rowData) {
      const { lines } = rowData;
      if (!lines) return;

      const packUnits = lines.map(line => {
        const { asPackUnit } = useUnitVariant(
          line.item?.id ?? '',
          line.item?.unitName ?? null
        );

        return {
          unit: asPackUnit(line?.packSize ?? 1),
        };
      });
      return (
        ArrayUtils.ifTheSameElseDefault(packUnits, 'unit', '[multiple]') ?? ''
      );
    } else {
      const { asPackUnit } = useUnitVariant(
        getItemId(rowData),
        getUnitName(rowData)
      );
      const packUnit = asPackUnit(getPackSize(rowData));

      return <InnerBasicCell isError={isError} value={packUnit} />;
    }
  };
