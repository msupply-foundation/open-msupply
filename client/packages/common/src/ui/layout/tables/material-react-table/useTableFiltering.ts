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
  ColumnDef,
  DateUtils,
  isEqual,
  UrlQueryValue,
  useFormatDateTime,
  useUrlQuery,
} from '@openmsupply-client/common';

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

  const filterState = useMemo(
    () => getFilterState(urlQuery, columns),
    [urlQuery]
  );

  const filterUpdaters = useMemo(() => {
    const filterUpdaters: Record<string, (value: any) => void> = {};

    columns.forEach(({ filterKey, id, accessorKey, filterVariant }) => {
      const key = (filterKey || id || accessorKey) as string;

      switch (filterVariant) {
        case 'date-range':
          filterUpdaters[key] = ([date1, date2]: [Date | '', Date | '']) => {
            updateQuery({
              [key]: {
                from: date1 ? customDate(date1, urlQueryDateTime) : '',
                to: date2 ? customDate(date2, urlQueryDateTime) : '',
              },
            });
          };
          break;

        case 'select':
        case 'text':
        case undefined: // default to text
          filterUpdaters[key] = (value: string) => {
            updateQuery({ [key]: value });
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
    // The "filterUpdate" function mutates the state in place, which messes up
    // subsequent comparisons, so we generate a new instance just for the
    // "filterUpdate" function, and ensure we use the original `filterState` for
    // comparisons:
    const old = getFilterState(urlQuery, columns);
    if (typeof filterUpdate === 'function') {
      const newFilterState = filterUpdate(old);
      const changedFilter = newFilterState.find(
        fil =>
          !isEqual(fil.value, filterState.find(f => f.id === fil.id)?.value)
      );
      if (!changedFilter) {
        const removedFilter = filterState.find(
          f => !newFilterState.find(nf => nf.id === f.id)
        );

        if (removedFilter) {
          updateQuery({ [getFilterKey(columns, removedFilter.id)]: undefined });
        }
        return;
      }
      const filterUpdater =
        filterUpdaters[getFilterKey(columns, changedFilter.id)];
      const newValue = changedFilter.value;
      if (filterUpdater) filterUpdater(newValue);
    }
  };

  return {
    columnFilters: filterState,
    onColumnFiltersChange: handleFilterChange,
  };
};

const getFilterState = <T extends MRT_RowData>(
  urlQuery: Record<string, UrlQueryValue>,
  columns: ColumnDef<T>[]
) => {
  return (
    Object.entries(urlQuery)
      // Ignore sort params from URL
      .filter(([id]) => id !== 'sort' && id !== 'dir')
      .map(([urlKey, val]) => {
        const column = columns.find(col => col.filterKey === urlKey);
        const id = column?.id || column?.accessorKey || urlKey;

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
      })
  );
};

const getFilterKey = <T extends MRT_RowData>(
  columns: ColumnDef<T>[],
  columnId: string
) => {
  const column = columns.find(col => (col.id ?? col.accessorKey) === columnId);
  const key = column?.filterKey || columnId;

  return key;
};
