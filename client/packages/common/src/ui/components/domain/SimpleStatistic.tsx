import React from 'react';
import { Box, Typography } from '../..';

export const SimpleStatistic = ({
  label,
  value,
  color = 'text.primary',
}: {
  label: string;
  value: number | string;
  color?: string;
}) => {
  const displayColor =
    typeof value === 'number' && value < 0 ? 'error.main' : color;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '-webkit-fill-available',
      }}
    >
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '1.5rem',
          color: displayColor,
        }}
      >
        {value}
      </Typography>
      <Typography color="secondary" fontSize="0.875em">
        {label}
      </Typography>
    </Box>
  );
};
