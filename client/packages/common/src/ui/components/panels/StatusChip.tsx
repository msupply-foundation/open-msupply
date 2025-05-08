import React from 'react';
import {
  CircleIcon,
  Box,
  Typography,
  SxProps,
  Theme,
} from '@openmsupply-client/common';

interface StatusChipProps {
  label: string | undefined;
  color: string | undefined;
  bgColor?: string;
  typographySx?: SxProps<Theme> | undefined;
}

export const StatusChip = ({
  label,
  color,
  bgColor,
  typographySx,
}: StatusChipProps) => {
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
      <Typography sx={{ paddingRight: 1, zIndex: 1, ...typographySx }}>
        {label}
      </Typography>
    </Box>
  );
};
