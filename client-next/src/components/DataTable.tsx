import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';

interface DataTableProps<T> {
  table: TanstackTable<T>;
  onRowClick?: (row: T) => void;
}

/**
 * Lean headless table renderer (TanStack Table + MUI). The page owns all state
 * (sorting/pagination wired to URL search params); this just renders.
 */
export function DataTable<T>({ table, onRowClick }: DataTableProps<T>) {
  return (
    <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableCell
                    key={header.id}
                    sortDirection={sorted || false}
                    sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    {header.column.getCanSort() ? (
                      <TableSortLabel
                        active={Boolean(sorted)}
                        direction={sorted === 'desc' ? 'desc' : 'asc'}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </TableSortLabel>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableHead>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow
              key={row.id}
              hover
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
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
    </TableContainer>
  );
}
