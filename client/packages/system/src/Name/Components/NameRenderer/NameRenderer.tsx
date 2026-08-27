import React from 'react';
import { Box, SxProps, Theme, Typography } from '@openmsupply-client/common';
import { HomeIcon } from '@common/icons';

export const NameRenderer = ({
  label,
  iconFlex,
  isStore,
  sx,
  width,
}: {
  label: string;
  iconFlex?: number;
  isStore: boolean;
  sx?: SxProps<Theme>;
  width?: number;
}) => (
  <Box
    display="flex"
    flexDirection="row"
    gap={1}
    width={width}
    alignItems="center"
  >
    <Box flex={iconFlex} style={{ height: 24, minWidth: 20 }}>
      {isStore && <HomeIcon fontSize="small" />}
    </Box>
    <Typography
      overflow="hidden"
      textOverflow="ellipsis"
      sx={{
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {label}
    </Typography>
  </Box>
);
