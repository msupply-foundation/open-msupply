import { useEffect } from 'react';
import type { ErrorComponentProps } from '@tanstack/react-router';
import { Box, Button, Stack, Typography } from '@mui/material';
import { isAuthError } from '@/lib/authError';
import { handleAuthError } from '@/app/tokenRefresh';
import { useTranslation } from '@/intl';

/**
 * Router-wide error UI. An auth failure tries a silent refresh (recovering the
 * route in place) and only redirects to login if that fails — instead of
 * dumping the raw GraphQL error to the screen.
 */
export function RouteError({ error }: ErrorComponentProps) {
  const { t } = useTranslation();
  const expired = isAuthError(error);

  useEffect(() => {
    if (expired) void handleAuthError();
  }, [expired]);

  if (expired) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="text.secondary">
          {t('messages.restoring-session')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h6">{t('heading.something-wrong')}</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ whiteSpace: 'pre-wrap' }}
        >
          {error.message}
        </Typography>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          {t('button.reload')}
        </Button>
      </Stack>
    </Box>
  );
}
