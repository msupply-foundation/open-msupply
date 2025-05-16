import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { VVMStatusSearchInput } from './VVMStatusSearchInput';
import { VvmStatusFragment } from '../../api';

export const VVMStatusInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled,
  vvmStatuses,
}: CellProps<T> & { vvmStatuses: VvmStatusFragment[] }) => {
  const selectedId = column.accessor({
    rowData,
  }) as string | null;

  const onChange = (vvmStatus: string | null) => {
    column.setter({ ...rowData, vvmStatus });
  };

  return (
    <VVMStatusSearchInput
      disabled={!!isDisabled}
      selectedId={selectedId}
      onChange={onChange}
      vvmStatuses={vvmStatuses}
    />
  );
};
