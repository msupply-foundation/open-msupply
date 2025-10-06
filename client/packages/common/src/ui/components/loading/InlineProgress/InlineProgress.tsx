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

function LinearProgressWithLabel(
  props: LinearProgressProps & { value: number }
) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress {...props} value={Math.min(props.value, 100)} />
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
      <LinearProgressWithLabel variant={variant} color={color} value={value} />
    </Box>
  );
};
