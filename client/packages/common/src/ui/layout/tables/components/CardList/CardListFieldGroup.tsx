import React from 'react';
import { Box, Divider, Typography, useMediaQuery } from '@mui/material';

const ICON_SX = { '& svg': { fontSize: '1rem' } } as const;

interface CardListFieldGroupProps {
  groupName?: string;
  groupIcon?: React.ReactNode;
  children: React.ReactNode;
}

export const CardListFieldGroup = ({
  groupName,
  groupIcon,
  children,
}: CardListFieldGroupProps) => {
  const isLandscape = useMediaQuery(
    '(orientation: landscape) and (max-height: 800px)'
  );
  const compact = isLandscape && !!groupIcon;

  const grid = (
    <Box
      display="grid"
      gridTemplateColumns={`repeat(auto-fill, minmax(${isLandscape ? '140px' : '200px'}, 1fr))`}
      gap={0.5}
      flex={1}
    >
      {children}
    </Box>
  );

  if (!groupName) return grid;

  if (compact) {
    // Landscape tablet: icon + left border accent, fields to the right
    return (
      <Box
        display="flex"
        gap={1}
        py={0.5}
        sx={{
          borderLeft: 2,
          borderColor: 'divider',
          pl: 1,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          color="text.secondary"
          sx={ICON_SX}
        >
          {groupIcon}
        </Box>
        {grid}
      </Box>
    );
  }

  // Portrait / desktop: divider with icon + label above, fields below
  return (
    <>
      <Divider sx={{ my: 0.5 }}>
        <Box display="flex" alignItems="center" gap={0.5}>
          {groupIcon && (
            <Box display="flex" color="text.secondary" sx={ICON_SX}>
              {groupIcon}
            </Box>
          )}
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            textTransform="uppercase"
            letterSpacing={0.5}
          >
            {groupName}
          </Typography>
        </Box>
      </Divider>
      <Box py={0.5}>{grid}</Box>
    </>
  );
};
