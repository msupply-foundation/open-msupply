import React, { FC, PropsWithChildren } from 'react';
import { Box, Grid, Typography } from '@mui/material';

interface DetailSectionProps {
  title: string;
}
export const DetailSection: FC<PropsWithChildren<DetailSectionProps>> = ({
  children,
  title,
}) => (
  <Grid container flex={1} flexDirection="column" gap={1}>
    <Grid item display="flex">
      <Box flex={1} flexBasis="40%"></Box>
      <Box flex={1} flexBasis="60%">
        <Typography fontWeight={700} fontSize={16}>
          {title}
        </Typography>
      </Box>
    </Grid>
    {children}
  </Grid>
);
