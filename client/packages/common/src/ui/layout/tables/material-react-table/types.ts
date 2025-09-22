import { MRT_ColumnDef, MRT_RowData } from 'material-react-table';
import { ColumnType } from './useGetColumnDefDefaults';

export type ColumnDef<T extends MRT_RowData> = MRT_ColumnDef<T> & {
  /** Short explanation of the column. Displays in the column menu */
  description?: string;

  /** Maps common column types to sensible display defaults (e.g. right
   * alignment & rounding for numbers). Defaults to string.*/
  columnType?: ColumnType;

  /** Display the column in the table. Use to handle columns only included for
   * certain preferences or permissions. Defaults to true */
  includeColumn?: boolean;

  /** When simplified mobile UI preference is enabled, hide the column by
   * default for small devices. User can still unhide it in the table settings.
   * Defaults to false */
  defaultHideOnMobile?: boolean;

  // Make the column sticky to a side of the table. User can unpin */
  pin?: 'left' | 'right';

  align?: 'left' | 'center' | 'right';
  // overflow?: 'ellipsis' | 'wrap'; // TO-DO -- will only affect "dense" layout
};

/** Use when you have `groupByField` enabled, to allow for typing of `subRows` */
export type Groupable<T extends MRT_RowData> = T & {
  isSubRow?: boolean;
  subRows?: T[];
};
