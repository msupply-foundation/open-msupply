/**
 * Hook to provide "filterUpdater" functions, to correctly update the URL query
 * based on the filter type; and "getFilterState" function, which converts the
 * current URL query into the filter state required by MRT.
 */
import { useMemo } from 'react';
import { MRT_RowData } from 'material-react-table';
import {
  DateUtils,
  useFormatDateTime,
  useUrlQuery,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

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

        // TODO: other filter types, number, boolean
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
