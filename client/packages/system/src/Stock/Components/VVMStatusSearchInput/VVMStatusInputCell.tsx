import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { VVMStatusSearchInput } from './VVMStatusSearchInput';
import { VvmStatusFragment } from '../../api';

export const VVMStatusInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled,
  useDefault = false,
}: CellProps<T> & { useDefault?: boolean }) => {
  const [defaultVal, setDefaultVal] = React.useState<
    VvmStatusFragment | undefined
  >(undefined);
  const selected = column.accessor({
    rowData,
  }) as VvmStatusFragment | null;

  const onChange = (vvmStatus?: VvmStatusFragment) => {
    column.setter({ ...rowData, vvmStatus });
  };

  if (useDefault && defaultVal && !selected) {
    column.setter({
      ...rowData,
      vvmStatus: defaultVal,
    });
  }

  return (
    <VVMStatusSearchInput
      disabled={!!isDisabled}
      selected={selected}
      onChange={onChange}
      useDefault={useDefault}
      setDefaultVal={setDefaultVal}
    />
  );
};
