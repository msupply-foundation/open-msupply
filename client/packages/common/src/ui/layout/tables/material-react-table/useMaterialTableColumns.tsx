/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import { useMemo } from 'react';
import { MRT_RowData } from 'material-react-table';
import {
  mergeCellProps,
  useSimplifiedTabletUI,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useMaterialTableColumns = <T extends MRT_RowData>(
  omsColumns: ColumnDef<T>[]
) => {
  const simplifiedMobileView = useSimplifiedTabletUI();
  const tableDefinition = useMemo(() => {
    const columns = omsColumns
      .filter(col => col.includeColumn !== false)
      .map(col => {
        if (col.align) {
          col.muiTableBodyCellProps = params => {
            // Add alignment styling
            return mergeCellProps(
              {
                sx:
                  col.align === 'right'
                    ? {
                        justifyContent: 'flex-end',
                        paddingRight: '2em', // Padding to account for header icons
                      }
                    : col.align === 'center'
                      ? // To-DO: Add padding for center aligned cells
                        { justifyContent: 'center' }
                      : {},
              },
              params
            );
          };
        }
        return col;
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
