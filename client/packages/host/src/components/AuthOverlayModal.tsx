import React, { useEffect } from 'react';
import { Grid, Typography } from '@mui/material';
import {
  AlertIcon,
  BasicModal,
  useAuthContext,
  useAuthOverlay,
  useQueryClient,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { Login } from './Login';

/**
 * Renders the re-authentication modal driven by useAuthOverlay(). Mounted
 * once near the top so the page underneath is preserved (form state,
 * scroll, etc.) while the user re-auths.
 */
export const AuthOverlayModal = () => {
  const t = useTranslation();
  const { reason, hide } = useAuthOverlay();
  const { token } = useAuthContext();
  const queryClient = useQueryClient();

  // Auto-hide when a valid token is present again — covers both the
  // embedded login form succeeding here and a sibling tab landing a fresh
  // shared auth cookie. Watch only `token` so that opening the modal
  // doesn't immediately re-hide it: AuthContext's React state can still
  // hold a token (e.g. the cookie was cleared in DevTools and the next
  // query 401'd) when QueryErrorHandler shows the overlay; we want
  // to hide only on a real token-came-back transition.
  //
  // Invalidating queries refetches anything that errored on the stale
  // cookie. Form state lives in component state, not in the query cache,
  // so it's preserved across the refetch.
  useEffect(() => {
    if (token && reason) {
      queryClient.invalidateQueries();
      hide();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!reason) return null;

  const title =
    reason === 'expired' ? t('auth.timeout-title') : t('auth.alert-title');
  const message =
    reason === 'expired'
      ? t('auth.timeout-message')
      : t('auth.unauthenticated-message');

  return (
    <BasicModal open width={400} height={200}>
      <Grid padding={4} container gap={1} flexDirection="column">
        <Grid container gap={1} alignItems="center">
          <AlertIcon color="primary" />
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Grid>
        <Grid sx={{ whiteSpace: 'pre-line' }}>{message}</Grid>
        <Login fullSize={false} />
      </Grid>
    </BasicModal>
  );
};
