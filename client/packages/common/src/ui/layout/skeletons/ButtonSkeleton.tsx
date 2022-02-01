import React from 'react';
import { Skeleton } from '@mui/material';

export const ButtonSkeleton: React.FC = () => {
  return (
    <Skeleton
      variant="rectangular"
      height={40}
      width={125}
      style={{ borderRadius: 24, transform: 'scale(1,1)' }}
    />
  );
};
