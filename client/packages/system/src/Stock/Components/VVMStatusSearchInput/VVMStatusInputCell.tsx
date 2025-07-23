import React from 'react';
import { RecordWithId, CellProps } from '@openmsupply-client/common';
import { VVMStatusSearchInput } from './VVMStatusSearchInput';

export const VVMStatusInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled,
  useDefault = false,
}: CellProps<T> & { useDefault?: boolean }) => {
  const [defaultVal, setDefaultVal] = React.useState<string | undefined>(
    undefined
  );
  const selectedId = column.accessor({
    rowData,
  }) as string | null;

  const onChange = (vvmStatusId: string | null) => {
    column.setter({ ...rowData, vvmStatusId });
  };

  if (useDefault && defaultVal && !selectedId) {
    column.setter({ ...rowData, vvmStatusId: defaultVal });
  }

  return (
    <VVMStatusSearchInput
      disabled={!!isDisabled}
      selectedId={selectedId}
      onChange={onChange}
      useDefault={useDefault}
      setDefaultVal={setDefaultVal}
    />
  );
};
