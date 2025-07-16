import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { ItemVariantFragment } from '../../api';
import { ItemVariantInput } from './ItemVariantInput';

interface ItemVariantInputCellProps {
  itemId: string;
}

export const ItemVariantInputCell = <T extends RecordWithId>({
  rowData,
  column,
  itemId,
}: CellProps<T> & ItemVariantInputCellProps) => {
  const selectedId = column.accessor({
    rowData,
  }) as string | null;

  const onVariantSelected = (itemVariant: ItemVariantFragment | null) => {
    column.setter({
      ...rowData,
      itemVariantId: itemVariant?.id ?? null,
      itemVariant,
    });
  };

  return (
    <ItemVariantInput
      selectedId={selectedId}
      itemId={itemId}
      onChange={onVariantSelected}
    />
  );
};
