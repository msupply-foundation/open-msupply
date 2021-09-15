import React, { FC } from 'react';
import { Box, Typography, Pagination } from '@material-ui/core';

interface PaginationRowProps {
  offset: number;
  first: number;
  total: number;
  onChange: (page: number) => void;
}

export const PaginationRow: FC<PaginationRowProps> = ({
  offset,
  first,
  total,
  onChange,
}) => {
  // Offset is zero indexed, but should display one indexed for
  // users.
  const xToY = `${offset + 1}-${first + offset}`;

  return (
    <Box
      display="flex"
      flexDirection="row"
      height="48px"
      justifyContent="space-between"
      alignItems="center"
      boxShadow="inset 0 0.5px 0 0 rgba(143, 144, 166, 0.5)"
      padding="0px 8px 0px 20px"
    >
      {!!total && (
        <>
          <Box display="flex" flexDirection="row">
            <Typography sx={{ marginRight: '4px' }}>Showing</Typography>
            <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
              {xToY}
            </Typography>
            <Typography sx={{ marginRight: '4px' }}>of</Typography>
            <Typography sx={{ fontWeight: 'bold', marginRight: '4px' }}>
              {total}
            </Typography>
          </Box>
          <Pagination
            count={Math.ceil(total / first)}
            onChange={(_, value) => {
              onChange(value - 1);
            }}
          />
        </>
      )}
    </Box>
  );
};
