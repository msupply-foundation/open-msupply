import { createSignal } from 'solid-js';
import type { PaginationProps } from './Pagination';

/**
 * Pages rows already in memory, for a `DataTable`'s `pagination`. Without
 * `onPageSizeChange` the page size is fixed.
 */
export const createLocalPagination = <T>(
  rows: () => T[],
  options: { pageSize: number; onPageSizeChange?: (pageSize: number) => void }
) => {
  const [offset, setOffset] = createSignal(0);
  const [pageSize, setPageSize] = createSignal(options.pageSize);
  const onPageSizeChange = options.onPageSizeChange;
  return {
    rows: () => rows().slice(offset(), offset() + pageSize()),
    /** Back to the first page, e.g. when a filter narrows the rows. */
    reset: () => setOffset(0),
    pagination: (): PaginationProps => ({
      offset: offset(),
      pageSize: pageSize(),
      total: rows().length,
      onOffsetChange: setOffset,
      onPageSizeChange: onPageSizeChange
        ? size => {
            onPageSizeChange(size);
            setPageSize(size);
            setOffset(0);
          }
        : undefined,
    }),
  };
};
