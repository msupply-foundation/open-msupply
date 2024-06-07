import React from 'react';
import { CellProps, Input, RecordWithId } from '@openmsupply-client/common';

export const EditableInput = <T extends RecordWithId>({
  column,
  rowData,
}: CellProps<T>): React.ReactElement<CellProps<T>> => {
  const text = String(column.accessor({ rowData }) ?? '');

  return <Input title={text} defaultValue={text}></Input>;
};
