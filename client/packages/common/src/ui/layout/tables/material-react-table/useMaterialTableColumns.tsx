/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import { useMemo } from 'react';
import { MRT_RowData } from 'material-react-table';
import {
  mergeCellProps,
  useGetColumnTypeDefaults,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useMaterialTableColumns = <T extends MRT_RowData>(
  omsColumns: ColumnDef<T>[]
) => {
  const simplifiedMobileView = useSimplifiedTabletUI();

  const getColumnTypeDefaults = useGetColumnTypeDefaults();

  const tableDefinition = useMemo(() => {
    const columns = omsColumns
      .filter(col => col.includeColumn !== false)
      .map(col => {
        const columnDefaults = getColumnTypeDefaults(col);

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
                        paddingRight: '2em', // Padding to account for header icons
                      }
                    : alignment === 'center'
                      ? // To-DO: Add padding for center aligned cells
                        { justifyContent: 'center' }
                      : {},
              },
              params
            );
          };
        }

        return {
          ...columnDefaults,
          enableColumnFilter:
            col.enableColumnFilter ?? !!col.filterVariant ?? false, // if a filter variant was explicitly set, take that as shorthand to enable the column filtering
          ...col,
        };
      });

    const defaultHiddenColumns = simplifiedMobileView
      ? columns.filter(col => col.defaultHideOnMobile).map(columnId)
      : [];

    const defaultColumnPinning = {
      left: [
        'mrt-row-select',
        ...columns.filter(col => col.pin === 'left').map(columnId),
      ],
      right: columns.filter(col => col.pin === 'right').map(columnId),
    };

    return { columns, defaultHiddenColumns, defaultColumnPinning };
  }, [omsColumns]);

  return tableDefinition;
};

const columnId = <T extends MRT_RowData>(column: ColumnDef<T>): string =>
  column.id ?? column.accessorKey ?? '';
