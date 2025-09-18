/**
 * Hook to map convenience column definitions (defined by us)
 * to the exact column structure required by MaterialReactTable
 */

import { useMemo } from 'react';
import { MRT_RowData } from 'material-react-table';
import {
  mergeCellProps,
  useGetColumnTypeDefaults,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useMaterialTableColumns = <T extends MRT_RowData>(
  omsColumns: ColumnDef<T>[]
) => {
  const getColumnTypeDefaults = useGetColumnTypeDefaults();

  const tableDefinition = useMemo(() => {
    const columns = omsColumns
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
          enableSorting: col.enableSorting ?? false,
          enableColumnFilter:
            col.enableColumnFilter ?? !!col.filterVariant ?? false, // if a filter variant was explicitly set, take that as shorthand to enable the column filtering
          ...col,
        };
      });

    return { columns };
  }, [omsColumns]);

  return tableDefinition;
};
