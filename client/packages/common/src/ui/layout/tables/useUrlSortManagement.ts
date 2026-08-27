import { useUrlQueryParams } from '@openmsupply-client/common';
import { MRT_SortingState, MRT_Updater } from 'material-react-table';
import { useCallback, useMemo, useState } from 'react';

export const useUrlSortManagement = (
  initialSort?: {
    key: string;
    dir: 'asc' | 'desc';
  },
  localStateOnly = false
) => {
  const {
    updateSortQuery,
    queryParams: { sortBy },
    clearSort,
  } = useUrlQueryParams({ initialSort });

  const [localSorting, setLocalSorting] = useState<MRT_SortingState>(
    initialSort
      ? [{ id: initialSort.key, desc: initialSort.dir === 'desc' }]
      : []
  );

  const handleLocalSortingChange = useCallback(
    (sortUpdate: MRT_Updater<MRT_SortingState>) => {
      setLocalSorting(prev =>
        typeof sortUpdate === 'function' ? sortUpdate(prev) : sortUpdate
      );
    },
    []
  );

  const handleUrlSortingChange = useCallback(
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

  const urlSorting = useMemo(() => {
    if (sortBy.key)
      return [{ id: sortBy.key, desc: !!sortBy.isDesc }] as MRT_SortingState;
    return [];
  }, [sortBy.key, sortBy.isDesc]);

  return {
    sorting: localStateOnly ? localSorting : urlSorting,
    onSortingChange: localStateOnly
      ? handleLocalSortingChange
      : handleUrlSortingChange,
  };
};
