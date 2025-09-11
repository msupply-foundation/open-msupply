import { MRT_ColumnDef, MRT_RowData } from 'material-react-table';

export type ColumnDef<T extends MRT_RowData> = MRT_ColumnDef<T> & {
  /** Short explanation of the column. Displays in the column menu */
  description?: string;

  /** Display the column in the table. Use to handle columns only included for certain preferences or permissions. Defaults to true */
  includeColumn?: boolean;

  /** When simplified mobile UI preference is enabled, hide the column by default for small devices. User can still unhide it in the table settings. Defaults to false */
  defaultHideOnMobile?: boolean;

  align?: 'left' | 'center' | 'right';
  // overflow?: 'ellipsis' | 'wrap'; // TO-DO -- will only affect "dense" layout
};
