import { useMemo } from 'react';
import { SortUtils } from '@openmsupply-client/common';
import { useMasterListColumns } from '../../../DetailView/columns';
import { useMasterListFields } from '../document/useMasterListFields';

export const useMasterListLines = () => {
  const { columns, onChangeSortBy, sortBy } = useMasterListColumns();
  const { lines } = useMasterListFields();

  const sorted = useMemo(() => {
    const currentColumn = columns.find(({ key }) => key === sortBy.key);
    const { getSortValue } = currentColumn ?? {};
    return getSortValue
      ? lines?.nodes.sort(
          SortUtils.getColumnSorter(getSortValue, !!sortBy.isDesc)
        )
      : lines?.nodes;
  }, [sortBy.key, sortBy.isDesc, lines]);

  return { lines: sorted, sortBy, onChangeSortBy, columns };
};
