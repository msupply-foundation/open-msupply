import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { ItemVariantSearchInput } from '.';

export const ItemVariantInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled,
  itemId,
}: CellProps<T> & { itemId: string }) => {
  const selectedId = column.accessor({
    rowData,
  }) as string | null;

  const onChange = (itemVariantId: string | null) => {
    column.setter({ ...rowData, itemVariantId });
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
