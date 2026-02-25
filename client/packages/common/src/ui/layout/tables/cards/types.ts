import React from 'react';

export interface CardFieldCellProps<T> {
  rowData: T;
  disabled: boolean;
}

export interface CardFieldDef<T> {
  /** Unique key for this field, used as React key */
  key: string;
  /** Display label for the field */
  label: string;
  /** Render function for the field value */
  Cell: (props: CardFieldCellProps<T>) => React.ReactNode;
  /** Grid column span: 1 = half width (default), 2 = full width */
  span?: 1 | 2;
  /** Whether to include this field. Defaults to true. */
  includeField?: boolean;
  /** Optional section grouping label for visual grouping */
  section?: string;
}

export type ViewMode = 'table' | 'card';
