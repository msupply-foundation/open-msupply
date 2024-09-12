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
      sx={{
        borderRadius: 4,
        textAlign: 'center',
        backgroundColor: bgColor,
      }}
      paddingY={0.1}
      paddingX={0.5}
      display="flex"
      alignItems="center"
      width="fit-content"
      minWidth={100}
      position="relative"
    >
      {!bgColor && (
        <Box
          sx={{
            backgroundColor: color,
            width: '100%',
            height: '100%',
            position: 'absolute',
            left: 0,
            top: 0,
            borderRadius: 4,
            opacity: 0.2,
          }}
        />
      )}
      <CircleIcon
        sx={{
          color,
          transform: 'scale(0.4)',
        }}
      />
      <Typography sx={{ paddingRight: 1 }}>{label}</Typography>
    </Box>
  );
};
