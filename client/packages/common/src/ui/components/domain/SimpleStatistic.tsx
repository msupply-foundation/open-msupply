import React from 'react';
import { Box, Typography } from '../..';

export const SimpleStatistic = ({
  label,
  value,
  color = 'text.primary',
}: {
  label: string;
  value: number;
  color?: string;
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '10rem',
      }}
    >
      <Typography color="gray.dark">{label}</Typography>
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '1.5rem',
          color: value < 0 ? 'error.main' : color,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};
