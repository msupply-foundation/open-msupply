/**
 * Hook to provide "filterUpdater" functions, to correctly update the URL query
 * based on the filter type; and "getFilterState" function, which converts the
 * current URL query into the filter state required by MRT.
 */
import { useMemo } from 'react';
import {
  MRT_ColumnFiltersState,
  MRT_RowData,
  MRT_Updater,
} from 'material-react-table';
import {
  DateUtils,
  isEqual,
  UrlQueryValue,
  useFormatDateTime,
  useUrlQuery,
} from '@openmsupply-client/common';

import { ColumnDef } from './types';

export const useTableFiltering = <T extends MRT_RowData>(
  columns: ColumnDef<T>[]
): {
  columnFilters: MRT_ColumnFiltersState;
  onColumnFiltersChange: (
    filterUpdate: MRT_Updater<MRT_ColumnFiltersState>
  ) => void;
} => {
  const { urlQuery, updateQuery } = useUrlQuery();
  const { customDate, urlQueryDateTime } = useFormatDateTime();

  const filterState = useMemo(() => getFilterState(urlQuery), [urlQuery]);

  const filterUpdaters = useMemo(() => {
    const filterUpdaters: Record<string, (value: any) => void> = {};

    columns.forEach(({ filterVariant, ...mrtProperties }) => {
      const filterKey = (mrtProperties.accessorKey ||
        mrtProperties.id) as string;

      switch (filterVariant) {
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

        case 'select':
        case 'text':
        case undefined: // default to text
          filterUpdaters[filterKey] = (value: string) => {
            updateQuery({ [filterKey]: value });
          };
          break;

        // TODO: other filter types, number, boolean
      }
    });

    return filterUpdaters;
  }, [columns]);

  const handleFilterChange = (
    filterUpdate: MRT_Updater<MRT_ColumnFiltersState>
  ) => {
    // The "filterUpdate" function mutates the "old" state in place, which
    // messes up the comparisons, so we generate a fresh version just for this:
    const old = getFilterState(urlQuery);
    if (typeof filterUpdate === 'function') {
      const newFilterState = filterUpdate(old);
      const changedFilter = newFilterState.find(
        fil => !isEqual(fil.value, old.find(f => f.id === fil.id)?.value)
      );
      if (!changedFilter) {
        const removedFilter = old.find(
          f => !newFilterState.find(nf => nf.id === f.id)
        );
        if (removedFilter) updateQuery({ [removedFilter.id]: undefined });
        return;
      }
      const filterUpdater = filterUpdaters[changedFilter.id];
      const newValue = changedFilter.value;
      if (filterUpdater) filterUpdater(newValue);
    }
  };

  return {
    columnFilters: filterState,
    onColumnFiltersChange: handleFilterChange,
  };
};

const getFilterState = (urlQuery: Record<string, UrlQueryValue>) => {
  return Object.entries(urlQuery)
    .filter(([id]) => id !== 'sort')
    .map(([id, val]) => {
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
