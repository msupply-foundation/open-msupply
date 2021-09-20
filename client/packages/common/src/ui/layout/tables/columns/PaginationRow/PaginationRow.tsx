import React, { FC } from 'react';
import { Box, Typography, Pagination } from '@material-ui/core';

interface PaginationRowProps {
  offset: number;
  first: number;
  total: number;
  page: number;
  onChange: (page: number) => void;
}

export const PaginationRow: FC<PaginationRowProps> = ({
  page,
  offset,
  first,
  total,
  onChange,
}) => {
  // Offset is zero indexed, but should display one indexed for
  // users.
  const xToY = `${offset + 1}-${Math.min(first + offset, total)}`;

  const onChangePage = (_: React.ChangeEvent<unknown>, value: number) => {
    // The type here is broken and `value` can be `null`!

    const isValidPage = !!value;

    if (isValidPage) {
      const zeroIndexedPageNumber = value - 1;
      onChange(zeroIndexedPageNumber);
    }
  };

  // Pages are zero indexed. The Pagination component wants the page as
  // one-indexed.
  const displayPage = page + 1;

  return (
    <Box
      display="flex"
      flexDirection="row"
      height="48px"
      minHeight="48px"
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
            page={displayPage}
            count={Math.ceil(total / first)}
            onChange={onChangePage}
          />
        </>
      )}
    </Box>
  );
};
