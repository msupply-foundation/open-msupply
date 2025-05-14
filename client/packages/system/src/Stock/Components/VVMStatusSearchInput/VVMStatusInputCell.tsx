import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { VVMStatusSearchInput } from './VVMStatusSearchInput';

export const VVMStatusInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled,
}: CellProps<T>) => {
  const selectedId = column.accessor({
    rowData,
  }) as string | null;

  const onChange = (vvmStatusId: string | null) => {
    column.setter({ ...rowData, vvmStatusId });
  };

  return (
    <VVMStatusSearchInput
      disabled={!!isDisabled}
      selectedId={selectedId}
      onChange={onChange}
    />
  );
};
