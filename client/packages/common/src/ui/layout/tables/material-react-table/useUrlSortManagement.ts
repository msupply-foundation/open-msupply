import { useUrlQueryParams } from '@openmsupply-client/common';
import { MRT_SortingState, MRT_Updater } from 'material-react-table';
import { useCallback, useMemo } from 'react';

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
        else {
          clearSort();
        }
      }
    },
    [sortBy]
  );

  const sorting = useMemo(() => {
    if (sortBy.key)
      return [{ id: sortBy.key, desc: !!sortBy.isDesc }] as MRT_SortingState;
    return [];
  }, [sortBy.key, sortBy.isDesc]);

  return {
    sorting,
    onSortingChange: handleSortingChange,
  };
};
