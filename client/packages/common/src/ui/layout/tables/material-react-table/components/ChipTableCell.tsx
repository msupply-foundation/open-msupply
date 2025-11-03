import { Box, Chip } from '@openmsupply-client/common';
import React from 'react';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

interface ChipTableCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
}

export const ChipTableCell = <T extends MRT_RowData>({
  cell,
}: ChipTableCellProps<T>) => {
  const items = cell.getValue<string[]>();

  if (!items || items.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.5,
        maxWidth: 250,
        padding: '3px 0',
      }}
    >
      {items.map((item, index) => (
        <Chip
          key={index}
          label={item}
          variant="outlined"
          size="small"
          sx={{ fontSize: 11 }}
        />
      ))}
    </Box>
  );
};
