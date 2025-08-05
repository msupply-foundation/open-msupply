import { DatePicker } from '@common/components';
import React from 'react';
import { CellProps } from '../../../columns';
import { RecordWithId } from '@common/types';
import { DateUtils } from '@common/intl';

export const DateInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled = false,
}: CellProps<T>) => {
  const date = column.accessor({ rowData }) as string;
  const value = DateUtils.getDateOrNull(date);
  const onChange = (newValue: Date | null) => {
    column.setter({ ...rowData, [column.key]: newValue });
  };
  return (
    // TODO can we generalise this to not be called expiry?
    <DatePicker
      value={value}
      onChange={onChange}
      disabled={!!isDisabled}
      sx={{
        width: column.width,
      }}
    />
  );
};
