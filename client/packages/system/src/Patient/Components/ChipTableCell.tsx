import { Box, CellProps, Chip, RecordWithId } from '@openmsupply-client/common';
import React from 'react';

/**
 * Displays a list of labels in a table cell.
 *
 * This expects that the data accessor returns a list of string for a given table row.
 */

export const ChipTableCell = <T extends RecordWithId>({
  rowData,
  column,
}: CellProps<T>) => {
  const items = column.accessor({ rowData }) as string[];

  if (items.length === 0) return null;

  return (
    <Box
      sx={{
        flexDirection: 'row',
        borderBottom: 'none',
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 0.2,
        padding: '3px 0',
      }}
    >
      {items.map((item, index) => (
        <Chip
          key={index}
          label={item}
          variant="outlined"
          size="small"
          sx={{
            fontSize: 11,
          }}
        />
      ))}
    </Box>
  );
};
