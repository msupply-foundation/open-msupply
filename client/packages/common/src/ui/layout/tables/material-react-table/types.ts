import { MRT_ColumnDef, MRT_RowData } from 'material-react-table';

export type ColumnDef<T extends MRT_RowData> = MRT_ColumnDef<T> & {
  description?: string;
};
