import React, { ReactElement } from 'react';
import { CellProps, HeaderProps } from '../columns/types';
import { DomainObject } from '../../../../types';
import { useTranslation, useFormatDate } from '../../../../intl';

export * from './DataRow';

export const BasicCell = <T extends DomainObject>({
  column,
  rowData,
}: CellProps<T>): ReactElement => {
  const t = useTranslation();
  const d = useFormatDate();

  return <>{column.formatter(column.accessor(rowData), { t, d })}</>;
};

export const BasicHeader = <T extends DomainObject>({
  column,
}: HeaderProps<T>): ReactElement => (
  <>{column.label === '' ? column.label : column.label}</>
);
