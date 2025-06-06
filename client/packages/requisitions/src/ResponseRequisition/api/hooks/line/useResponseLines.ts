import { useMemo } from 'react';
import {
  SortController,
  SortUtils,
  Column,
  useItemUtils,
} from '@openmsupply-client/common';
import { ResponseLineFragment } from '../../operations.generated';
import { useResponseColumns } from '../../../DetailView/columns';
import { useResponseFields } from '../document/useResponseFields';

interface UseResponseLinesController
  extends SortController<ResponseLineFragment> {
  lines: ResponseLineFragment[];
  columns: Column<ResponseLineFragment>[];
  itemFilter: string;
  setItemFilter: (itemFilter: string) => void;
  onChangeSortBy: any;
}

export const useResponseLines = (
  manageVaccinesInDoses: boolean = false
): UseResponseLinesController => {
  const { lines } = useResponseFields('lines');
  const { columns, onChangeSortBy, sortBy } = useResponseColumns(
    manageVaccinesInDoses
  );
  const { itemFilter, setItemFilter, matchItem } = useItemUtils();

  const sorted = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    const { getSortValue } = currentColumn ?? {};
    const sortedLines = getSortValue
      ? lines?.nodes.sort(
          SortUtils.getColumnSorter(getSortValue, !!sortBy.isDesc)
        )
      : lines?.nodes;
    return sortedLines.filter(item => matchItem(itemFilter, item.item));
  }, [sortBy.key, sortBy.isDesc, lines, itemFilter]);

  return {
    lines: sorted,
    sortBy,
    onChangeSortBy,
    columns,
    itemFilter,
    setItemFilter,
  };
};
