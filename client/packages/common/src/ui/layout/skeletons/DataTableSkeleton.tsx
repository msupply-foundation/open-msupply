import React from 'react';

import { Grid, Skeleton, Stack } from '@mui/material';
interface DataTableSkeletonProps {
  hasGroupBy?: boolean;
}

export const DataTableSkeleton: React.FC<DataTableSkeletonProps> = ({
  hasGroupBy,
}) => {
  return (
    <Grid style={{ margin: 10, width: '100%' }}>
      <Stack height={500} gap={0}>
        {hasGroupBy && (
          <Skeleton variant="rectangular" height={32} width={175} />
        )}
        <Skeleton variant="text" height={60} />
        <Skeleton variant="rectangular" style={{ flex: 1 }} />
        <Skeleton variant="text" height={45} />
      </Stack>
    </Grid>
  );
};
