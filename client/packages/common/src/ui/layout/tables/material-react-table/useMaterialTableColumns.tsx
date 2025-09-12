/**
 * Hook to map column settings (as defined by us, with a handful of common
 * filter types) to the exact column structure required by MaterialReactTable
 *
 * Also provides "filterUpdater" functions, to correctly update the URL query
 * based on the filter type; and "getFilterState" function, which converts the
 * current URL query into the filter state required by MRT.
 */
import { useMemo } from 'react';
import { MRT_RowData } from 'material-react-table';
import {
  DateUtils,
  mergeCellProps,
  useFormatDateTime,
  useSimplifiedTabletUI,
  useUrlQuery,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const columnAlign = <T extends MRT_RowData>(
  align: 'left' | 'center' | 'right'
): Pick<ColumnDef<T>, 'muiTableBodyCellProps'> => ({
  muiTableBodyCellProps: params => {
    // Add alignment styling
    return mergeCellProps(
      {
        sx:
          align === 'right'
            ? {
                justifyContent: 'flex-end',
                paddingRight: '2em', // Padding to account for header icons
              }
            : align === 'center'
              ? // To-DO: Add padding for center aligned cells
                { justifyContent: 'center' }
              : {},
      },
      params
    );
  },
});

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
      ? columns
          .filter(col => col.defaultHideOnMobile)
          .map(col => String(col.id ?? col.accessorKey))
      : [];

    return { columns, defaultHiddenColumns };
  }, [omsColumns]);

  return tableDefinition;
};

export const useManualTableFilters = <T extends MRT_RowData>(
  columns: ColumnDef<T>[]
) => {
  const { urlQuery, updateQuery } = useUrlQuery();
  const { customDate, urlQueryDateTime } = useFormatDateTime();

  const filterUpdaters = useMemo(() => {
    const filterUpdaters: Record<string, (value: any) => void> = {};

    columns.forEach(({ filterVariant, ...mrtProperties }) => {
      const filterKey = (mrtProperties.accessorKey ||
        mrtProperties.id) as string;

      switch (filterVariant) {
        case 'text':
        case 'select':
          filterUpdaters[filterKey] = (value: string) => {
            updateQuery({ [filterKey]: value });
          };
          break;

        // filterVariant: 'select',
        // filterSelectOptions: filterValues,
        case 'date-range':
          filterUpdaters[filterKey] = ([date1, date2]: [
            Date | '',
            Date | '',
          ]) => {
            updateQuery({
              [filterKey]: {
                from: date1 ? customDate(date1, urlQueryDateTime) : '',
                to: date2 ? customDate(date2, urlQueryDateTime) : '',
              },
            });
          };
          break;
      }
    });

    return filterUpdaters;
  }, [columns]);

  const getFilterState = () => {
    return Object.entries(urlQuery).map(([id, val]) => {
      // Date range
      if (typeof val === 'object' && ('to' in val || 'from' in val))
        return {
          id,
          value: [
            val.from ? DateUtils.getDateOrNull(val.from as string) : '',
            val.to ? DateUtils.getDateOrNull(val.to as string) : '',
          ],
        };

      // TO-DO: Implement filter state for other types

      return {
        id,
        value: val,
      };
    });
  };

  return { filterUpdaters, getFilterState };
};
