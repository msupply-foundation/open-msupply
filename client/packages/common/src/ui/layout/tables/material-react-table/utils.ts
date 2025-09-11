import type {
  MRT_Cell,
  MRT_Column,
  MRT_Row,
  MRT_RowData,
  MRT_TableInstance,
} from 'material-react-table';
import type { TableCellProps } from '@mui/material/TableCell';
import { LocaleKey, TypedTFunction } from '@common/intl';
import { isEqual } from '@common/utils';

// Type for the function parameters passed to muiTableBodyCellProps
type MuiTableBodyCellPropsParams<TData extends Record<string, any>> = {
  cell: MRT_Cell<TData, unknown>;
  column: MRT_Column<TData, unknown>;
  row: MRT_Row<TData>;
  table: MRT_TableInstance<TData>;
};

// Helper function to merge props - gets global props from table automatically
export const mergeCellProps = <TData extends Record<string, any>>(
  customProps: TableCellProps,
  params: MuiTableBodyCellPropsParams<TData>
): TableCellProps => {
  const { table } = params;
  const globalPropsOption = table.options.muiTableBodyCellProps;

  // Resolve global props if it's a function
  const globalProps =
    typeof globalPropsOption === 'function'
      ? globalPropsOption(params)
      : globalPropsOption || {};

  return {
    ...globalProps,
    ...customProps,
    sx: {
      ...(globalProps.sx || {}),
      ...(customProps.sx || {}),
    } as TableCellProps['sx'],
  };
};

export const getGroupedRows = <T extends MRT_RowData>(
  data: T[],
  groupByField: keyof T | undefined,
  t: TypedTFunction<LocaleKey>
): (T & { isSubRow?: boolean; subRows?: T[] })[] => {
  if (!groupByField) return data;

  // Group rows by groupByField
  const grouped = data.reduce(
    (acc, item) => {
      const key = item[groupByField] as string;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );

  // For each group, create a summary row and subRows, or just return the row if only one
  return Object.values(grouped)
    .map(groupRows => {
      if (groupRows.length === 1) {
        // Only one row in group, return as-is
        return groupRows[0];
      }
      // All rows in this group
      const subRows = groupRows.map(row => ({ ...row, isSubRow: true }));
      // Build the summary row
      const summary: Record<string, any> = {};
      const keys = Object.keys(groupRows[0] || {});
      for (const key of keys) {
        // Don't include subRows or isSubRow in summary
        if (key === 'subRows' || key === 'isSubRow') continue;
        const values = groupRows.map(row => row[key as keyof T]);
        const allEqual = values.every(v => isEqual(v, values[0]));
        summary[key] = allEqual ? values[0] : t('multiple');
      }
      // Attach subRows
      summary['subRows'] = subRows;
      return summary as T & { subRows: (T & { isSubRow: true })[] };
    })
    .filter((row): row is T => row !== undefined);
};
