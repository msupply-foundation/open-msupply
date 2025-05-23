import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { ItemVariantSearchInput } from '.';
import { ItemVariantFragment } from '../../api';

export const ItemVariantInputCellOld = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled,
  itemId,
}: CellProps<T> & { itemId: string }) => {
  const selectedId = column.accessor({
    rowData,
  }) as string | null;

  const onChange = (variant: ItemVariantFragment | null) => {
    column.setter({
      ...rowData,
      itemVariantId: variant?.id ?? null,
      itemVariant: variant,
    });
  };

  return (
    <ItemVariantSearchInput
      itemId={itemId}
      disabled={!!isDisabled}
      selectedId={selectedId}
      onChange={onChange}
    />
  );
};
