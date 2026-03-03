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
  const isLandscapeTablet = useMediaQuery(
    '(orientation: landscape) and (max-height: 800px)'
  );
  const compact = isLandscapeTablet && !!groupIcon;

  return (
    <Box>
      {groupName &&
        (compact ? (
          // Landscape tablet: icon on the left, fields to the right
          <Box display="flex" gap={1} py={0.5}>
            <Box
              display="flex"
              alignItems="center"
              color="text.secondary"
              sx={ICON_SX}
            >
              {groupIcon}
            </Box>
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))"
              gap={1}
              flex={1}
            >
              {children}
            </Box>
          </Box>
        ) : (
          // Portrait / desktop: divider with icon + label above, fields below
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
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))"
              gap={1}
              py={0.5}
            >
              {children}
            </Box>
          </>
        ))}
      {!groupName && (
        <Box
          display="grid"
          gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))"
          gap={1}
          py={0.5}
        >
          {children}
        </Box>
      )}
    </Box>
  );
};
