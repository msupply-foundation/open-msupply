import React, { FC } from 'react';
import { Typography, Box } from '@openmsupply-client/common';

interface SimpleLabelDisplayProps {
  label: string;
  value: string | number;
}

export const SimpleLabelDisplay: FC<SimpleLabelDisplayProps> = ({
  label,
  value,
}) => {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: '1rem!important',
          fontWeight: 'bold',
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: '1.2rem!important',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};
