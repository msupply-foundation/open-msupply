import React from 'react';

import { Box, Skeleton, Stack } from '@mui/material';
import { AppBarContentPortal, AppFooterPortal } from '../../components/portals';
import { ButtonSkeleton } from './ButtonSkeleton';
import { BasicSpinner } from '@common/components';

const AppBarContent = () => (
  <Box display="flex" flexDirection="column" gap={1} width="100%">
    <Box gap={1} alignItems="flex-end" display="flex" flex={1}>
      <Box flex={1} display="flex">
        <Box flex={0}>
          <Stack gap={1}>
            <Skeleton variant="rectangular" height={40} width={415} />
            <Skeleton variant="rectangular" height={40} width={415} />
          </Stack>
        </Box>
        <Box flex={1} justifyContent="center" display="flex" gap={1}>
          <Skeleton variant="rectangular" height={100} width={300} />
          <Skeleton variant="rectangular" height={100} width={300} />
        </Box>
      </Box>
    </Box>
    <Box justifyContent="center" display="flex" flex={1} gap={1}>
      <Skeleton variant="rectangular" height={30} width={100} />
      <Skeleton variant="rectangular" height={30} width={100} />
      <Skeleton variant="rectangular" height={30} width={100} />
    </Box>
  </Box>
);

const StackOfFields = ({ count }: { count: number }) => (
  <Stack gap={1}>
    <Skeleton
      variant="text"
      height={40}
      width={100}
      style={{ marginLeft: 85 }}
    />
    {Array.from({ length: count }).map((_, n) => (
      <Box display="flex" gap={1} key={n}>
        <Skeleton variant="text" height={40} width={75} />
        <Skeleton variant="rectangular" height={40} width={415} />
      </Box>
    ))}
  </Stack>
);

const DetailForm = () => (
  <Box style={{ width: '100%' }} padding={4}>
    <Box display="flex" justifyContent="center" gap={4}>
      <Box>
        <StackOfFields count={5} />
        <Box style={{ height: 20 }} />
        <StackOfFields count={3} />
      </Box>
      <Box>
        <StackOfFields count={4} />
        <Box style={{ height: 20 }} />
        <StackOfFields count={4} />
      </Box>
    </Box>
    <Box style={{ height: 20 }} />
    <Box display="flex" justifyContent="center" gap={2}>
      <ButtonSkeleton />
      <ButtonSkeleton />
    </Box>
  </Box>
);

const footerContent = (
  <Box
    gap={2}
    display="flex"
    flexDirection="row"
    alignItems="center"
    height={64}
  >
    <Skeleton variant="text" width={500} />
  </Box>
);

export const DetailFormSkeleton = () => {
  return (
    <>
      <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
        <AppBarContent />
      </AppBarContentPortal>
      <DetailForm />
      <AppFooterPortal Content={footerContent} />
    </>
  );
};

export const DetailLoadingSkeleton = () => {
  return (
    <>
      <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
        <AppBarContent />
      </AppBarContentPortal>
      <BasicSpinner />
      <AppFooterPortal Content={footerContent} />
    </>
  );
};
