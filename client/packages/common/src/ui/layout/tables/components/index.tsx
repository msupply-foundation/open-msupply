import React, { ReactElement } from 'react';
import { CellProps, HeaderProps } from '../columns/types';
import { DomainObject } from '../../../../types';
import { useTranslation, useFormatDate } from '../../../../intl';

export * from './DataRow';
export * from './Cells';
export const cellHorizontalPadding = 16;

export const BasicCell = <T extends DomainObject>({
  column,
  rowData,
}: CellProps<T>): ReactElement => {
  const t = useTranslation();
  const d = useFormatDate();

  return (
    <span
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        width: column.width - 2 * cellHorizontalPadding,
        display: 'inline-block',
      }}
    >
      {column.formatter(column.accessor(rowData), { t, d })}
    </span>
  );
};

export const BasicHeader = <T extends DomainObject>({
  column,
}: HeaderProps<T>): ReactElement => {
  const t = useTranslation();
  const header = column.label === '' ? '' : t(column.label);
  return <>{header}</>;
};
