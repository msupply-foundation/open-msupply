import React, { FC, PropsWithChildren } from 'react';
import { Box, Typography } from '@mui/material';
import { Grid } from '@openmsupply-client/common';

interface DetailSectionProps {
  title: string;
}
export const DetailSection: FC<PropsWithChildren<DetailSectionProps>> = ({
  children,
  title,
}) => (
  <Grid container flex={1} flexDirection="column" gap={1}>
    <Grid display="flex">
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
