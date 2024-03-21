import { MasterListLineFragment } from '../api/operations.generated';
import {
  TooltipTextCell,
  useColumns,
  useUrlQueryParams,
} from '@openmsupply-client/common';

export const useMasterListColumns = () => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });
  const columns = useColumns<MasterListLineFragment>(
    [
      [
        'itemCode',
        {
          Cell: TooltipTextCell,
          width: 100,
          accessor: ({ rowData }) => rowData.item.code,
          getSortValue: rowData => rowData.item.code,
        },
      ],
      [
        'itemName',
        {
          width: 350,
          accessor: ({ rowData }) => rowData.item.name,
          getSortValue: rowData => rowData.item.name,
        },
      ],
      [
        'itemUnit',
        {
          width: 150,
          accessor: ({ rowData }) => rowData.item.unitName,
          getSortValue: rowData => rowData.item.unitName ?? '',
        },
      ],
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return { columns, sortBy, onChangeSortBy: updateSortQuery };
};
