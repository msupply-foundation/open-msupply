import React from 'react';
import { Box } from '@mui/material';
import { useIsLandscapeTablet } from '@common/hooks';

const ICON_SX = { '& svg': { fontSize: '1rem' } } as const;

interface CardListFieldGroupProps {
  groupIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const CardListFieldGroup = ({
  groupIcon,
  children,
}: CardListFieldGroupProps) => {
  const isLandscape = useIsLandscapeTablet();

  const grid = (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(auto-fill, minmax(${isLandscape ? '125px' : '175px'}, 1fr))`}
      rowGap={3}
      columnGap={3}
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
      py={3}
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
