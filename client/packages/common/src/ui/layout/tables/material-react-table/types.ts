import { MRT_ColumnDef, MRT_RowData } from 'material-react-table';

type FilterType = 'none' | 'text' | 'number' | 'enum' | 'dateRange';

interface EnumOption {
  value: string;
  label: string;
}

export type ColumnDef<T extends MRT_RowData> = MRT_ColumnDef<T> & {
  filterType?: FilterType;
  filterValues?: EnumOption[];
  description?: string;
  /** Display the column, defaults to true */
  showColumn?: boolean;
  /** When simplified mobile UI enable, hide the column by default - defaults to false */
  defaultHideOnMobile?: boolean;
};
