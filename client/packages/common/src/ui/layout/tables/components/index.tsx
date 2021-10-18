import React, { ReactElement } from 'react';
import { CellProps, HeaderProps } from '../columns/types';
import { DomainObject } from '../../../../types';
import { useTranslation } from '../../../../intl';

export * from './DataRow';

const capitalize = (str: string) =>
  str.slice(0, 1).toUpperCase() + str.slice(1, str.length).toLowerCase();

export const BasicCell = <T extends DomainObject>({
  column,
  rowData,
}: CellProps<T>): ReactElement => {
  return <>{capitalize(String(column.accessor(rowData)))}</>;
};

export const BasicHeader = <T extends DomainObject>({
  column,
}: HeaderProps<T>): ReactElement => {
  const t = useTranslation();
  const header = column.label === '' ? column.label : t(column.label);

  return <>{header}</>;
};
