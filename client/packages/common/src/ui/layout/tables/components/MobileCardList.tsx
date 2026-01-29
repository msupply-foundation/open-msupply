import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import {
  flexRender,
  MRT_Row,
  MRT_RowData,
  MRT_TableInstance,
  MRT_TopToolbar,
} from 'material-react-table';

import React from 'react';

const TableCard = <T extends MRT_RowData>({
  row,
  onClick,
}: {
  row: MRT_Row<T>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) => {
  const cells = row.getVisibleCells();

  return (
    <Card
      sx={{ overflow: 'visible', maxWidth: 400, width: '100%' }}
      onClick={onClick}
    >
      <CardContent>
        <Stack spacing={0.5}>
          {cells.map(cell => {
            // Don't show "Select" checkbox in mobile card view
            if (cell.column.id === 'mrt-row-select') return null;

            const content = cell.column.columnDef.Cell
              ? flexRender(cell.column.columnDef.Cell, cell.getContext())
              : cell.renderValue();
            return (
              <Box key={cell.id} display="flex" justifyContent="space-between">
                <Typography color="text.secondary">
                  {flexRender(cell.column.columnDef.header, cell.getContext())}
                </Typography>
                <Box>{content as React.ReactNode}</Box>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export const MobileCardList = <T extends MRT_RowData>({
  table,
}: {
  table: MRT_TableInstance<T>;
}) => {
  return (
    <>
      <Stack spacing={2} sx={{ width: '100%', alignItems: 'center', m: 2 }}>
        <MRT_TopToolbar table={table} />
        {table.getRowModel().rows.map(row => {
          const rowProps =
            typeof table.options.muiTableBodyRowProps === 'function'
              ? ((
                  table.options.muiTableBodyRowProps as
                    | ((args: {
                        row: typeof row;
                        table: typeof table;
                      }) => React.HTMLProps<HTMLDivElement>)
                    | undefined
                )?.({ row, table }) ?? {})
              : (table.options.muiTableBodyRowProps ?? {});

          const onClick = rowProps.onClick;

          return <TableCard key={row.id} row={row} onClick={onClick} />;
        })}
      </Stack>
    </>
  );
};
