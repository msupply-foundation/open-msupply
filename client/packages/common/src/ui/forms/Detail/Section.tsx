import React, { FC } from 'react';
import { Box, Grid, Typography } from '@mui/material';

interface DetailSectionProps {
  title: string;
  children?: React.ReactNode;
}
export const DetailSection: FC<DetailSectionProps> = ({ children, title }) => (
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
