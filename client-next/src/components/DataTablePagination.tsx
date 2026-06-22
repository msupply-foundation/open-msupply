import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';
import type { Table as TanstackTable } from '@tanstack/react-table';
import { useTranslation } from '@/intl';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps<T> {
  table: TanstackTable<T>;
  pageSizeOptions?: number[];
}

/**
 * Pagination footer replacing MUI TablePagination. Driven by the TanStack table
 * instance — page/size changes flow through the table's onPaginationChange (the
 * list pages wire that to the URL search params).
 */
export function DataTablePagination<T>({
  table,
  pageSizeOptions = [25, 50, 100],
}: DataTablePaginationProps<T>) {
  const { t } = useTranslation();
  const { pageIndex, pageSize } = table.getState().pagination;
  const count = table.getRowCount();
  const pageCount = table.getPageCount();
  const from = count === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min((pageIndex + 1) * pageSize, count);

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 px-1 py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {t('label.rows-per-page')}
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={value => table.setPageSize(Number(value))}
        >
          <SelectTrigger size="sm" className="w-[4.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map(option => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <span className="text-muted-foreground">
        {t('label.pagination-range', { from, to, count })}
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          aria-label="First page"
        >
          <ChevronsLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Previous page"
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Next page"
        >
          <ChevronRightIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!table.getCanNextPage()}
          aria-label="Last page"
        >
          <ChevronsRightIcon />
        </Button>
      </div>
    </div>
  );
}
