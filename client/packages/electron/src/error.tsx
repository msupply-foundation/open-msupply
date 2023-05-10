import React from 'react';
import { UnhappyMan } from '@common/icons';
import {
  Stack,
  Typography,
  useSearchParams,
  useTranslation,
} from '@openmsupply-client/common';

export const ErrorPage = () => {
  const t = useTranslation();
  const [searchParams] = useSearchParams();
  const errorMessage = searchParams.get('error');

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        height: '100%',
      }}
    >
      <div>
        <UnhappyMan />
      </div>
      <Stack justifyContent="center" alignItems="center">
        <h3>{t('error.something-wrong')}</h3>
        <Typography sx={{ color: 'error.main' }}>{errorMessage}</Typography>
      </Stack>
    </Stack>
  );
};
