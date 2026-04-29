import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, Box, Slide } from '@mui/material';
import { NetworkError, useQueryClient } from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';

/**
 * Floating banner shown while one or more queries are in a NetworkError
 * state. React Query owns the retries; this just gives the user
 * something to see while it does.
 *
 * Dismiss semantics: clicking the close button hides the banner only
 * for the failures the user has seen. If a *new* query subsequently
 * fails (a query that wasn't already in an error state), the banner
 * reopens — even before the existing errors clear. This way a user
 * working offline gets confirmation that subsequent actions are also
 * blocked by the network, but isn't nagged by retries of an
 * already-known failure.
 *
 * Accessibility:
 *  - `role="status"` + `aria-live="polite"` announces between user
 *    actions rather than interrupting them. Connection blips don't
 *    warrant the more aggressive `role="alert"`.
 *  - Severity is "warning" — connections drops are usually
 *    self-recovering, so we communicate "needs attention" without
 *    alarming language.
 *  - Dismiss is a real `<button>` via Alert's `onClose` — keyboard
 *    focusable, Enter/Space activates.
 *  - Slide animation respects `prefers-reduced-motion` via MUI.
 *
 * Design note: this is the first persistent floating banner in the
 * codebase. If a second one appears (offline mode, sync in progress,
 * etc.), extract a shared `<StatusBanner>` primitive in common/ui.
 */
export const ConnectionLostBanner = () => {
  const queryClient = useQueryClient();
  const t = useTranslation();
  // Each new failure increments `freshFailures`. The dismiss button
  // captures the current count; the banner is visible whenever there
  // are unseen failures.
  const [freshFailures, setFreshFailures] = useState(0);
  const [seenFailures, setSeenFailures] = useState(0);
  const [hasNetworkError, setHasNetworkError] = useState(false);

  useEffect(() => {
    const cache = queryClient.getQueryCache();
    let prevErroredHashes = new Set<string>();

    const evaluate = () => {
      const erroredHashes = new Set<string>();
      let newFailure = false;
      for (const q of cache.getAll()) {
        // Only count queries that are currently mounted somewhere.
        // Inactive queries (e.g. a list view the user has navigated
        // away from) keep their cached error state until refetched, so
        // including them would leave the banner stuck open even after
        // connectivity returns.
        if (q.getObserversCount() === 0) continue;
        if (q.state.error instanceof NetworkError) {
          erroredHashes.add(q.queryHash);
          // Transition: this query wasn't errored last time we looked.
          if (!prevErroredHashes.has(q.queryHash)) newFailure = true;
        }
      }
      prevErroredHashes = erroredHashes;
      setHasNetworkError(erroredHashes.size > 0);
      if (newFailure) setFreshFailures(c => c + 1);
    };

    evaluate();

    return cache.subscribe(event => {
      // When any query succeeds, the connection is clearly back.
      // Invalidate every query still stuck in NetworkError state so
      // they refetch — one by one they'll succeed and `evaluate` clears
      // the banner. Triggered by user-initiated activity rather than a
      // timer, so we don't pulse the server while the user is idle.
      //
      // Filter on the success *transition* (`action.type === 'success'`)
      // not the current status — `queryUpdated` fires for any state
      // change on a query, including observer churn, so checking
      // `state.status === 'success'` would re-invalidate on every event
      // touching an already-successful query and cascade infinitely.
      if (
        event?.type === 'queryUpdated' &&
        event.action.type === 'success'
      ) {
        queryClient.invalidateQueries({
          predicate: q => q.state.error instanceof NetworkError,
        });
      }

      evaluate();
    });
  }, [queryClient]);

  const open = hasNetworkError && freshFailures > seenFailures;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: theme => theme.spacing(2),
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: theme => theme.zIndex.snackbar,
        width: 'min(420px, calc(100% - 32px))',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <Slide in={open} direction="down" mountOnEnter unmountOnExit>
        <Alert
          severity="warning"
          variant="filled"
          role="status"
          aria-live="polite"
          onClose={() => setSeenFailures(freshFailures)}
          sx={{ boxShadow: 3 }}
        >
          <AlertTitle sx={{ mb: 0.25 }}>
            {t('error.connection-error')}
          </AlertTitle>
          {t('error.connection-error-hint')}
        </Alert>
      </Slide>
    </Box>
  );
};
