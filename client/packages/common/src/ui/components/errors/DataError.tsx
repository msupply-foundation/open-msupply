import React from 'react';
import { useTranslation } from '@common/intl';
import { useAppTheme } from '@common/styles';
import { Box, AlertIcon, Typography, Stack } from '@openmsupply-client/common';

export type DataErrorProps = {
  error?: string;
  title?: string;
};

export const DataError = ({ error, title }: DataErrorProps) => {
  const t = useTranslation();
  const theme = useAppTheme();
  const heading = title || t('error.no-data');

  return (
    <Stack
      flex={1}
      justifyContent="center"
      alignItems="center"
      height="100%"
      padding={1}
      sx={{ color: theme.palette.background.error }}
    >
      <AlertIcon sx={{ fontSize: 120 }} />
      <Box justifyContent="center"></Box>
      <Typography fontSize={18} fontWeight={700} sx={{ color: 'error.main' }}>
        {heading}
      </Typography>
      <Typography fontSize={14} sx={{ color: 'error.main' }} display="inline">
        {error ? error : t('error.unable-to-load-data')}
      </Typography>
    </Stack>
  );
};
