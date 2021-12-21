import React, { ReactElement } from 'react';
import { CellProps, HeaderProps } from '../columns/types';
import { DomainObject } from '@common/types';
import { useTranslation, useFormatDate } from '@common/intl';

export * from './DataRow';
export * from './Cells';
export * from './Header';
export * from './Expand';

export const BasicCell = <T extends DomainObject>({
  column,
  rowData,
  rows,
}: CellProps<T>): ReactElement => {
  const t = useTranslation();
  const d = useFormatDate();

  return (
    <div
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {column.formatter(column.accessor({ rowData, rows }), { t, d })}
    </div>
  );
};

export const BasicHeader = <T extends DomainObject>({
  column,
}: HeaderProps<T>): ReactElement => {
  const t = useTranslation();
  const header = column.label === '' ? '' : t(column.label);
  return <>{header}</>;
};
