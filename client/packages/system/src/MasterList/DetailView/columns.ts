import { MasterListLineFragment } from '../api/operations.generated';
import { useColumns, useQueryParamsStore } from '@openmsupply-client/common';

export const useMasterListColumns = () => {
  const { sort } = useQueryParamsStore();
  const { sortBy, onChangeSortBy } = sort;
  const columns = useColumns<MasterListLineFragment>(
    [
      [
        'itemCode',
        {
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
      onChangeSortBy,
      sortBy,
    },
    [onChangeSortBy, sortBy]
  );

  return { columns, sortBy, onChangeSortBy };
};
