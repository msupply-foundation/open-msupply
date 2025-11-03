import React from 'react';
import { Box, Chip } from '@openmsupply-client/common';
import { MRT_Cell, MRT_RowData } from 'material-react-table';

export const ChipTableCell = <T extends MRT_RowData>({
  cell,
}: {
  cell: MRT_Cell<T>;
}) => {
  const items = cell.getValue<string[]>();
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
