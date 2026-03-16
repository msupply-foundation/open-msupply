import React from 'react';
import { Box, useMediaQuery } from '@mui/material';

const ICON_SX = { '& svg': { fontSize: '1rem' } } as const;

interface CardListFieldGroupProps {
  groupName?: string;
  groupIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const CardListFieldGroup = ({
  groupIcon,
  children,
}: CardListFieldGroupProps) => {
  const isLandscape = useMediaQuery(
    '(orientation: landscape) and (max-height: 800px)'
  );

  const grid = (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(auto-fill, minmax(${isLandscape ? '140px' : '200px'}, 1fr))`}
      rowGap={2}
      columnGap={1}
      flex={1}
    >
      {children}
    </Box>
  );

  if (!groupIcon) return grid;

  return (
    <Box
      display="flex"
      gap={2}
      py={1.5}
      sx={{
        pl: 1,
      }}
    >
      <Box
        display="flex"
        alignItems="flex-start"
        color="text.secondary"
        sx={ICON_SX}
      >
        {groupIcon}
      </Box>
      {grid}
    </Box>
  );
};
