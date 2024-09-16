import React from 'react';

import { CellProps } from '../../../columns';
import { Box, CircleIcon, Typography } from '@openmsupply-client/common';
import { RecordWithId } from '@common/types';

interface StatusProps {
  statusMap: Record<
    string,
    { label: string; color: string; bgColor?: string }
  > | null;
}

export const StatusCell = <T extends RecordWithId>({
  rowData,
  column,
  statusMap,
}: CellProps<T> & StatusProps) => {
  const { label, color, bgColor } =
    statusMap?.[String(column.accessor({ rowData }))] ?? {};

  if (!label) return null;
  return (
    <Box
      sx={{ textAlign: 'center' }}
      paddingY={0.1}
      paddingX={0.5}
      display="flex"
      alignItems="center"
      width="fit-content"
      position="relative"
    >
      {/* If bgColor is not specified, we use a faded (low opacity) version of the dot color as the background */}
      <Box
        sx={{
          backgroundColor: bgColor ?? color,
          width: '100%',
          height: '100%',
          position: 'absolute',
          left: 0,
          top: 0,
          borderRadius: 4,
          opacity: bgColor ? 1 : 0.2,
        }}
      />
      <CircleIcon sx={{ color, transform: 'scale(0.4)' }} />
      <Typography sx={{ paddingRight: 1, zIndex: 1 }}>{label}</Typography>
    </Box>
  );
};
