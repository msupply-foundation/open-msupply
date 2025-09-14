import { DatePicker } from '@common/components';
import React from 'react';
import { CellProps } from '../../../columns';
import { RecordWithId } from '@common/types';
import { DateUtils } from '@common/intl';
import { getTextFieldSx } from '@openmsupply-client/common/src/ui/components/inputs/DateTimePickers/styles';

export const DateInputCell = <T extends RecordWithId>({
  rowData,
  column,
  isDisabled = false,
}: CellProps<T>) => {
  const width = column.width || '100%';
  const date = column.accessor({ rowData }) as string;
  const value = DateUtils.getDateOrNull(date);
  const onChange = (newValue: Date | null) => {
    column.setter({ ...rowData, [column.key]: newValue });
  };
  const displayDt = true;
  return (
    <DatePicker
      value={value}
      onChange={onChange}
      disabled={!!isDisabled}
      sx={{
        ...getTextFieldSx(false, !displayDt, undefined, width),
        width,
        minWidth: displayDt ? 200 : undefined,
      }}
    />
  );
};
