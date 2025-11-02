import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';
import {
  ItemVariantFragment,
  ItemVariantInput,
} from '@openmsupply-client/system';

interface ItemVariantInputCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
  itemId: string;
  updateFn: (value: ItemVariantFragment | null) => void;
}

export const ItemVariantCell = <T extends MRT_RowData>({
  cell,
  itemId,
  updateFn,
}: ItemVariantInputCellProps<T>) => {
  const { getValue, column, row } = cell;
  const selected = column.accessorFn
    ? // Workaround for tanstack bug:
      (column.accessorFn(row.original, row.index) as ItemVariantFragment | null)
    : getValue<ItemVariantFragment | null>();

  const onVariantSelected = (itemVariant: ItemVariantFragment | null) => {
    updateFn(itemVariant);
  };

  return (
    <ItemVariantInput
      selectedId={selected?.id || null}
      itemId={itemId}
      onChange={onVariantSelected}
      width={'100%'}
    />
  );
};
