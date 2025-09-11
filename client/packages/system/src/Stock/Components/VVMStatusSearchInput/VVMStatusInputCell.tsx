import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { VVMStatusSearchInput } from './VVMStatusSearchInput';
import { VvmStatusFragment } from '../../api';

export const VVMStatusInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled,
  useDefault = false,
  onChange: onChangeFunction,
  selected: selectedVvmStatus,
}: CellProps<T> & { useDefault?: boolean }) => {
  console.log('selectedVvmStatus', selectedVvmStatus);
  const selected =
    selectedVvmStatus !== undefined
      ? selectedVvmStatus
      : (column.accessor({
          rowData,
        }) as VvmStatusFragment | null);

  const onChange = onChangeFunction
    ? (vvmStatus?: VvmStatusFragment | null) => onChangeFunction(vvmStatus)
    : (vvmStatus?: VvmStatusFragment | null) => {
        column.setter({ ...rowData, vvmStatus });
      };

  return (
    <VVMStatusSearchInput
      disabled={!!isDisabled}
      selected={selected}
      onChange={onChange}
      useDefault={useDefault}
    />
  );
};
