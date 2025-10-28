/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import React, { useMemo } from 'react';
import { MRT_Column, MRT_RowData } from 'material-react-table';
import {
  mergeCellProps,
  Tooltip,
  useGetColumnTypeDefaults,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useMaterialTableColumns = <T extends MRT_RowData>(
  omsColumns: ColumnDef<T>[]
) => {
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
          col.muiTableBodyCellProps = params => {
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
                            params.table.getState().density === 'compact'
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
          col.muiTableBodyCellProps = params => {
            return mergeCellProps(cellProps, params);
          };
        }

        return {
          grow: true,
          Header: ColumnHeaderWithTooltip, // can't define this globally for the table unfortunately
          ...columnDefaults,
          enableSorting: col.enableSorting ?? false,
          enableColumnFilter: col.enableColumnFilter ?? false,
          ...col,
        };
      });

    return { columns };
  }, [omsColumns]);

  return tableDefinition;
};

// Show full column name on hover, in case it's truncated
// If we can get "click header to open column menu" working, we could probably remove the tooltip
const ColumnHeaderWithTooltip = <T extends MRT_RowData>({
  column,
}: {
  column: MRT_Column<T>;
}) => (
  <Tooltip title={column.columnDef.header} placement="top">
    <div
      style={{
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {column.columnDef.header}
    </div>
  </Tooltip>
);
