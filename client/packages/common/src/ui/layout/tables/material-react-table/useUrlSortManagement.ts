import { useUrlQueryParams } from '@openmsupply-client/common';
import { MRT_SortingState, MRT_Updater } from 'material-react-table';
import { useCallback } from 'react';

/** Use for any paginated datasets. Sort, filter and pagination must be handled externally */
export const useUrlSortManagement = (initialSort?: {
  key: string;
  dir: 'asc' | 'desc';
}) => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
    clearSort,
  } = useUrlQueryParams({ initialSort });

  const handleSortingChange = useCallback(
    (sortUpdate: MRT_Updater<MRT_SortingState>) => {
      if (typeof sortUpdate === 'function') {
        // MRT can handle multiple sort fields, but for now we're only
        // supporting one, so we take the first item of the array
        const newSortValue = sortUpdate([
          { id: sortBy.key, desc: !!sortBy.isDesc },
        ])[0];
        if (newSortValue)
          updateSortQuery(newSortValue.id, newSortValue.desc ? 'desc' : 'asc');
        else clearSort();
      }
    },
    [sortBy]
  );

  return {
    sorting: [{ id: sortBy.key, desc: !!sortBy.isDesc }],
    onSortingChange: handleSortingChange,
  };
};
