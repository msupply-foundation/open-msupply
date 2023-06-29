import {
  Box,
  CellProps,
  RecordWithId,
  Typography,
} from '@openmsupply-client/common';
import React from 'react';

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
      }}
    >
      {items.map((item, index) => (
        <Box
          sx={{
            padding: 0.5,
          }}
          key={index}
        >
          <Typography
            sx={{
              fontSize: 12,
              border: 1,
              borderRadius: 15,
              padding: 0.5,
              backgroundColor: 'background.drawer',
            }}
          >
            {item}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};
