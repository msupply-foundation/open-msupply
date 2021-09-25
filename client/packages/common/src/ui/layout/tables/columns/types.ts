import { JSXElementConstructor } from 'react';
import { LocaleKey } from './../../../../intl/intlHelpers';
import { DomainObject } from './../../../../types';

export interface CellProps<T extends DomainObject> {
  rowData: T;
  columns: Column<T>[];
  column: Column<T>;
  rowKey: string;
}

export interface HeaderProps<T extends DomainObject> {
  column: Column<T>;
}

export enum ColumnFormat {
  date,
  integer,
  real,
  text,
}

export enum ColumnAlign {
  Left = 'left',
  Right = 'right',
  Center = 'center',
}

export type ColumnDataAccessor<T extends DomainObject> = (rowData: T) => string;

export enum GenericColumnKey {
  Selection = 'selection',
}

export interface Column<T extends DomainObject> {
  key: keyof T | GenericColumnKey;
  accessor: ColumnDataAccessor<T>;

  label: LocaleKey | '';

  format: ColumnFormat;
  align: ColumnAlign;

  sortable: boolean;
  sortDescFirst: boolean;
  sortType: 'datetime' | 'numeric' | 'alphanumeric';
  sortInverted: boolean;

  width: number;
  minWidth: number;

  order?: number;

  Cell: JSXElementConstructor<CellProps<T>>;
  Header: JSXElementConstructor<HeaderProps<T>>;
}

export interface ColumnDefinition<T extends DomainObject>
  extends Partial<Omit<Column<T>, 'key'>> {
  key: keyof T | GenericColumnKey;
}
