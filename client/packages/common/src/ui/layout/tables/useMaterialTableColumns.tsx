/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import React, { useMemo } from 'react';
import type {
  MRT_Column,
  MRT_RowData,
  MRT_Cell,
  MRT_Row,
  MRT_TableInstance,
} from './mrtCompat';
import type { CellContext } from '@tanstack/react-table';
import {
  defaultAggregationFn,
  mergeCellProps,
  multipleKeys,
  Tooltip,
  useGetColumnTypeDefaults,
  useTranslation,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useMaterialTableColumns = <T extends MRT_RowData>(
  omsColumns: ColumnDef<T>[]
) => {
  const t = useTranslation();
  const getColumnTypeDefaults = useGetColumnTypeDefaults();

  const tableDefinition = useMemo(() => {
    const columns: ColumnDef<T>[] = omsColumns
      .filter(col => col.includeColumn !== false)
      .map(col => {
        const columnDefaults = getColumnTypeDefaults(col);

        // TODO: probably these mappings should be in getColumnTypeDefaults,
        // so all the mapping is in one place, easily discoverable?

        // Add alignment styling
        const alignment = col.align ?? columnDefaults.align;
        if (alignment) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          col.muiTableBodyCellProps = (params: any) => {
            return mergeCellProps(
              {
                sx:
                  alignment === 'right'
                    ? {
                        justifyContent: 'flex-end',
                      }
                    : alignment === 'center'
                      ? // To-DO: Add padding for center aligned cells
                        { justifyContent: 'center' }
                      : {
                          // Left aligned (fallback):
                          // Padding varies based on density
                          paddingLeft:
                            (params.table.options.meta as { density?: string })?.density === 'compact'
                              ? '0.7em'
                              : '1.2em',
                        },
              },
              params
            );
          };
        }

        // Merge any custom cell props with defaults
        const cellProps = col.muiTableBodyCellProps;
        if (cellProps) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          col.muiTableBodyCellProps = (params: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return mergeCellProps(cellProps as any, params);
          };
        }

        // Default aggregation cell that shows '[multiple]' if there are multiple values, otherwise renders as normal cell
        const DefaultAggregationCell = (props: {
          cell: MRT_Cell<T, unknown>;
          column: MRT_Column<T>;
          row: MRT_Row<T>;
          table: MRT_TableInstance<T>;
          staticColumnIndex?: number;
          staticRowIndex?: number;
        }) => {
          const cellContext = {
            cell: props.cell,
            column: props.column,
            row: props.row,
            table: props.table,
            getValue: () => props.cell.getValue(),
            renderValue: () => props.cell.renderValue(),
          };
          return (
            <>
              {props.cell.getValue() === multipleKeys
                ? // show '[multiple]' if the aggregation function returned it
                  t('multiple')
                : // otherwise render the cell using the column's Cell renderer
                  // would be nice to replace this with an internal MRT component but the most suitable one (MRT_TableBodyCellValue) causes an infinite loop
                  (
                    col.Cell ??
                    // fallback to column type default Cell renderer
                    columnDefaults.Cell ??
                    // fallback to rendering the cell value as a string
                    (({ cell }) => cell.renderValue()?.toString() ?? '')
                  )(cellContext as CellContext<T, unknown>)}
            </>
          );
        };

        return {
          grow: true,
          Header: ColumnHeaderWithTooltip, // can't define this globally for the table unfortunately
          aggregationFn: defaultAggregationFn,
          GroupedCell: DefaultAggregationCell,
          AggregatedCell: DefaultAggregationCell,
          PlaceholderCell: DefaultAggregationCell,
          ...columnDefaults,
          enableGrouping: false, // removes the "group by" option from the column menu
          enableSorting: col.enableSorting ?? false,
          enableColumnFilter: col.enableColumnFilter ?? false,
          ...col,
        };
      });

    return { columns };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [omsColumns]);

  return tableDefinition;
};

// Show full column name on hover, in case it's truncated
// If we can get "click header to open column menu" working, we could probably remove the tooltip
const ColumnHeaderWithTooltip = <T extends MRT_RowData>({
  column,
}: {
  column: MRT_Column<T>;
}) => {
  const header = column.columnDef.header;
  const headerText = typeof header === 'string' ? header : '';
  const content = (
    <div
      style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {headerText}
    </div>
  );

  return typeof header === 'string' ? (
    <Tooltip title={headerText} placement="top">
      {content}
    </Tooltip>
  ) : (
    content
  );
};
