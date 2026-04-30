import React from 'react';
import { Box, Chip } from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

interface ChipTableCellProps<T extends MRT_RowData> {
  cell: MRT_Cell<T>;
}

/**
 * Displays a list of labels in a table cell.
 *
 * This expects that the data accessor returns a list of string for a given table row.
 */
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
