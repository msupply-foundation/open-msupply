import React from 'react';

import { Box, Grid, Skeleton, Stack } from '@mui/material';
import {
  AppBarButtonsPortal,
  AppBarContentPortal,
  AppFooterPortal,
} from '../../components/portals';
import { ButtonSkeleton } from './ButtonSkeleton';
import { DataTableSkeleton } from './DataTableSkeleton';
import { DropdownSkeleton } from './DropdownSkeleton';

interface DetailViewSkeletonProps {
  hasGroupBy?: boolean;
  hasHold?: boolean;
}

export const DetailViewSkeleton: React.FC<DetailViewSkeletonProps> = ({
  hasHold,
  hasGroupBy,
}) => {
  const footerContent = (
    <Box
      gap={2}
      display="flex"
      flexDirection="row"
      alignItems="center"
      height={64}
    >
      {hasHold && <ButtonSkeleton />}
      <Skeleton variant="text" width={500} />
      <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
        <ButtonSkeleton />
      </Box>
    </Box>
  );
  return (
    <>
      <AppBarButtonsPortal>
        <Grid gap={1} container>
          <ButtonSkeleton />
          <ButtonSkeleton />
        </Grid>
      </AppBarButtonsPortal>
      <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
        <Box gap={1} alignItems="flex-end" display="flex" flex={1}>
          <Box flex={1}>
            <Stack gap={1}>
              <Skeleton variant="rectangular" height={40} width={415} />
              <Skeleton variant="rectangular" height={40} width={415} />
            </Stack>
          </Box>
          <Box>
            <DropdownSkeleton />
          </Box>
        </Box>
      </AppBarContentPortal>
      <AppFooterPortal Content={footerContent} />
      <DataTableSkeleton hasGroupBy={hasGroupBy} />
    </>
  );
};
