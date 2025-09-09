import { MRT_ColumnDef, MRT_RowData } from 'material-react-table';

export type FilterType = 'none' | 'text' | 'number' | 'enum' | 'dateRange';

export interface EnumOption {
  value: string;
  label: string;
}

export type ColumnDef<T extends MRT_RowData> = MRT_ColumnDef<T> & {
  description?: string;
  align?: 'left' | 'center' | 'right';
  filterType?: FilterType;
  filterValues?: EnumOption[];
  // overflow?: 'ellipsis' | 'wrap'; // TO-DO -- will only affect "dense" layout
};
