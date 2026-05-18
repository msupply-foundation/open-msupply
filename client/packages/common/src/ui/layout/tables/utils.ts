import type {
  MRT_Cell,
  MRT_Column,
  MRT_Row,
  MRT_TableInstance,
} from 'material-react-table';
import type { TableCellProps } from '@mui/material/TableCell';

// Type for the function parameters passed to muiTableBodyCellProps
type MuiTableBodyCellPropsParams<TData extends Record<string, any>> = {
  cell: MRT_Cell<TData, unknown>;
  column: MRT_Column<TData, unknown>;
  row: MRT_Row<TData>;
  table: MRT_TableInstance<TData>;
};

// Helper function to merge props - gets global props from table automatically
export const mergeCellProps = <TData extends Record<string, any>>(
  customProps:
    | TableCellProps
    | ((params: MuiTableBodyCellPropsParams<TData>) => TableCellProps),
  params: MuiTableBodyCellPropsParams<TData>
): TableCellProps => {
  const { table } = params;
  const globalPropsOption = table.options.muiTableBodyCellProps;

  const resolvedCustomProps =
    typeof customProps === 'function' ? customProps(params) : customProps || {};

  const globalProps =
    typeof globalPropsOption === 'function'
      ? globalPropsOption(params)
      : globalPropsOption || {};

  return {
    ...globalProps,
    ...resolvedCustomProps,
    sx: {
      ...(globalProps.sx || {}),
      ...(resolvedCustomProps.sx || {}),
    } as TableCellProps['sx'],
  };
};
