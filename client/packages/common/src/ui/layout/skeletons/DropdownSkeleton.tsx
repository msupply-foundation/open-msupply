import React from 'react';
import { Skeleton } from '@mui/material';

export const DropdownSkeleton = () => (
  <Skeleton
    variant="rectangular"
    height={40}
    width={160}
    style={{ borderRadius: 8 }}
  />
);
