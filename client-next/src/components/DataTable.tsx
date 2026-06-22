import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<T> {
  table: TanstackTable<T>;
  onRowClick?: (row: T) => void;
}

/**
 * Lean headless table renderer (TanStack Table + shadcn Table). The page owns
 * all state (sorting/pagination wired to URL search params); this just renders.
 */
export function DataTable<T>({ table, onRowClick }: DataTableProps<T>) {
  return (
    <div className="flex-1 overflow-auto rounded-md border bg-card">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const sorted = header.column.getIsSorted();
                const canSort = header.column.getCanSort();
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      sorted === 'asc'
                        ? 'ascending'
                        : sorted === 'desc'
                          ? 'descending'
                          : undefined
                    }
                    className="font-semibold whitespace-nowrap"
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="-mx-1 flex items-center gap-1 rounded px-1 hover:text-foreground"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {sorted === 'asc' ? (
                          <ArrowUpIcon className="size-3.5" />
                        ) : sorted === 'desc' ? (
                          <ArrowDownIcon className="size-3.5" />
                        ) : (
                          <ChevronsUpDownIcon className="size-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
