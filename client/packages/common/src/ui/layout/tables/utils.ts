import type {
  MRT_Cell,
  MRT_Column,
  MRT_Row,
  MRT_TableInstance,
} from './mrtCompat';
import type { TableCellProps } from '@mui/material/TableCell';

// Type for the function parameters passed to muiTableBodyCellProps
type MuiTableBodyCellPropsParams<TData extends Record<string, any>> = {
  cell: MRT_Cell<TData, unknown>;
  column: MRT_Column<TData, unknown>;
  row: MRT_Row<TData>;
  table: MRT_TableInstance<TData>;
};

// Helper function to merge column-level cell props with any additional props.
// Global styling is applied by the DataTable renderer; this only merges the
// per-column customProps with the resolved base (empty or from a function).
export const mergeCellProps = <TData extends Record<string, any>>(
  customProps:
    | TableCellProps
    | ((params: MuiTableBodyCellPropsParams<TData>) => TableCellProps),
  params: MuiTableBodyCellPropsParams<TData>
): TableCellProps => {
  const resolvedCustomProps =
    typeof customProps === 'function' ? customProps(params) : customProps || {};

  return {
    ...resolvedCustomProps,
    sx: resolvedCustomProps.sx || {},
  } as TableCellProps;
};
