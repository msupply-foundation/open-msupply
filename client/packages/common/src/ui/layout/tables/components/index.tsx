import React, { ReactElement } from 'react';
import { CellProps, HeaderProps } from '../columns/types';
import { RecordWithId } from '@common/types';
import { useTranslation } from '@common/intl';

export * from './DataRow';
export * from './Cells';
export * from './Header';
export * from './Expand';

export const BasicCell = <T extends RecordWithId>({
  column,
  rowData,
  rows,
  localisedText,
  localisedDate,
}: CellProps<T>): ReactElement => (
  <div
    style={{
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    {column.formatter(column.accessor({ rowData, rows }), {
      t: localisedText,
      d: localisedDate,
    })}
  </div>
);

export const BasicHeader = <T extends RecordWithId>({
  column,
}: HeaderProps<T>): ReactElement => {
  const t = useTranslation();
  const header = column.label === '' ? '' : t(column.label, column.labelProps);
  return <>{header}</>;
};
