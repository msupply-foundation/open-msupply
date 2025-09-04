/**
 * Hook to map column settings (as defined by us, with a handful of common
 * filter types) to the exact column structure required by MaterialReactTable
 */
import { useMemo } from 'react';
import { MRT_ColumnDef, MRT_RowData } from 'material-react-table';
import {
  DateUtils,
  useFormatDateTime,
  useUrlQuery,
} from '@openmsupply-client/common';

type FilterType = 'none' | 'text' | 'number' | 'enum' | 'dateRange';

interface EnumOption {
  value: string;
  label: string;
}

type ColumnDefinition<T extends MRT_RowData> = MRT_ColumnDef<T> & {
  filterType?: FilterType;
  filterValues?: EnumOption[];
};

export const useMaterialTableColumns = <T extends MRT_RowData>(
  columns: ColumnDefinition<T>[]
) => {
  const { urlQuery, updateQuery } = useUrlQuery();
  const { customDate, urlQueryDateTime } = useFormatDateTime();

  const { mrtColumnDefinitions, filterUpdaters } = useMemo(() => {
    const mrtColumnDefinitions: MRT_ColumnDef<T>[] = [];
    const filterUpdaters: Record<string, (value: any) => void> = {};

    columns.forEach(
      ({ filterType = 'none', filterValues, ...mrtProperties }) => {
        const filterKey = (mrtProperties.accessorKey ||
          mrtProperties.id) as string;

        switch (filterType) {
          case 'none':
            mrtColumnDefinitions.push({
              ...mrtProperties,
              enableColumnFilter: false,
            });
            break;
          case 'text':
            mrtColumnDefinitions.push(mrtProperties);
            filterUpdaters[filterKey] = (value: string) => {
              updateQuery({ [filterKey]: value });
            };
            break;

          case 'enum':
            mrtColumnDefinitions.push({
              ...mrtProperties,
              filterVariant: 'select',
              filterSelectOptions: filterValues,
            });
            filterUpdaters[filterKey] = (value: string) => {
              updateQuery({ [filterKey]: value });
            };
            break;
          // case 'number':
          //   TO-DO
          case 'dateRange':
            mrtColumnDefinitions.push({
              ...mrtProperties,
              filterVariant: 'date-range',
            });
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
          default:
            mrtColumnDefinitions.push(mrtProperties);
        }
      }
    );

    return { mrtColumnDefinitions, filterUpdaters };
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

  return { mrtColumnDefinitions, filterUpdaters, getFilterState };
};
