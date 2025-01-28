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
}

function LinearProgressWithLabel(
  props: LinearProgressProps & { value: number }
) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress {...props} />
      </Box>
      {props.variant == 'determinate' ? (
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">{`${Math.round(
            props.value
          )}%`}</Typography>
        </Box>
      ) : null}
    </Box>
  );
}

export const InlineProgress: FC<InlineProgressProps> = ({
  color = 'primary',
  value = 1,
  variant = 'indeterminate',
}) => {
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <LinearProgressWithLabel variant={variant} color={color} value={value} />
    </Box>
  );
};
