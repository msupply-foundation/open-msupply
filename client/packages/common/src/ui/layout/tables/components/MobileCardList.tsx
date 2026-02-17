import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import {
  MRT_Row,
  MRT_RowData,
  MRT_TableBodyCellValue,
  MRT_TableInstance,
  MRT_TopToolbar,
} from 'material-react-table';

import React from 'react';

const DefaultCard = <T extends MRT_RowData>({
  table,
  row,
}: CustomCardProps<T>) => {
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

            return (
              <Box
                key={cell.id}
                display="flex"
                justifyContent="space-between"
                gap={1}
                alignItems="flex-start"
              >
                <Typography color="text.secondary">
                  {cell.column.columnDef.header}
                </Typography>
                <Box
                  sx={{
                    textAlign: 'end',
                    maxWidth: '65%',
                    wordBreak: 'break-word',
                  }}
                >
                  <MRT_TableBodyCellValue table={table} cell={cell} />
                </Box>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
};

export type CustomCardProps<T extends MRT_RowData> = {
  table: MRT_TableInstance<T>;
  row: MRT_Row<T>;
};

export const MobileCardList = <T extends MRT_RowData>({
  table,
  CustomCard,
}: {
  table: MRT_TableInstance<T>;
  CustomCard?: (props: CustomCardProps<T>) => React.JSX.Element;
}) => {
  return (
    <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
      <Box
        sx={{
          width: table.options.renderTopToolbarCustomActions && '100%',
        }}
      >
        <MRT_TopToolbar table={table} />
      </Box>
      <Box>
        {table
          .getRowModel()
          .rows.map(row => (CustomCard ?? DefaultCard)({ table, row }))}
      </Box>
    </Stack>
  );
};
