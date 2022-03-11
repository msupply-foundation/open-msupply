import { useEffect } from 'react';
import { MasterListLineFragment } from '../api/operations.generated';
import {
  useColumns,
  useSortBy,
  SortBy,
  zustand,
} from '@openmsupply-client/common';

type Store = {
  sortBy: SortBy<MasterListLineFragment>;
  setSortBy: (sortBy: SortBy<MasterListLineFragment>) => void;
};

const useStore = zustand<Store>(set => ({
  sortBy: { key: 'itemName', isDesc: false, direction: 'asc' },
  setSortBy: (sortBy: SortBy<MasterListLineFragment>) =>
    set(state => ({ ...state, sortBy })),
}));

const useSharedSortBy = () => {
  const sharedSortBy = useStore();
  const { sortBy, onChangeSortBy } = useSortBy<MasterListLineFragment>(
    sharedSortBy.sortBy
  );

  useEffect(() => {
    sharedSortBy.setSortBy(sortBy);
  }, [sortBy]);
  return { sortBy, onChangeSortBy };
};

export const useMasterListColumns = () => {
  const { sortBy, onChangeSortBy } = useSharedSortBy();
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
