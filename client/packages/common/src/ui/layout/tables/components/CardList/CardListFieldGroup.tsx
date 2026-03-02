import React from 'react';
import { Box, Divider, Typography } from '@mui/material';

interface CardListFieldGroupProps {
  groupName?: string;
  children: React.ReactNode;
}

export const CardListFieldGroup = ({
  groupName,
  children,
}: CardListFieldGroupProps) => (
  <Box>
    {groupName && (
      <Divider sx={{ my: 0.5 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={600}
          textTransform="uppercase"
          letterSpacing={0.5}
        >
          {groupName}
        </Typography>
      </Divider>
    )}
    <Box
      display="grid"
      gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))"
      gap={1}
      py={0.5}
    >
      {children}
    </Box>
  </Box>
);
