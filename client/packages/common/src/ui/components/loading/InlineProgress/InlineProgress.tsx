import React, { FC } from 'react';
import {
  Box,
  LinearProgress,
  LinearProgressProps,
  Typography,
} from '@mui/material';

interface InlineProgressProps {
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  value?: number;
  variant?: 'determinate' | 'indeterminate' | 'buffer' | 'query';
  width?: number | string;
}

export const InlineProgress: FC<InlineProgressProps> = ({
  color = 'primary',
  value = 1,
  variant = 'indeterminate',
  width,
}) => {
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress
            variant={variant}
            color={color}
            value={Math.min(value, 100)}
          />
        </Box>
        {variant == 'determinate' ? (
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">{`${Math.round(
              value
            )}%`}</Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};
