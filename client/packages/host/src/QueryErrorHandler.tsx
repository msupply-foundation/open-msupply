import React, { useEffect, useState } from 'react';
import Bugsnag from '@bugsnag/js';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  AuthError,
  BadUserInputError,
  InternalServerError,
  NetworkError,
  PermissionDeniedError,
  UnauthenticatedError,
  useLocalStorage,
  useLocation,
  useQueryClient,
} from '@openmsupply-client/common';

type RoutedToast =
  | { kind: 'none' }
  | { kind: 'short'; message: string }
  | { kind: 'detail'; message: string };

export const QueryErrorHandler = () => {
  const client = useQueryClient();
  const { errorWithDetail, error } = useNotification();
  const t = useTranslation();
  const [pending, setPending] = useState<RoutedToast>({ kind: 'none' });
  const location = useLocation();
  const [authError, setAuthError] = useLocalStorage('/error/auth');

  useEffect(() => {
    if (pending.kind === 'none') return;
    if (authError === AuthError.Unauthenticated) return;
    if (pending.kind === 'detail') {
      errorWithDetail(pending.message)();
    } else {
      error(pending.message)();
    }
    setPending({ kind: 'none' });
  }, [pending, authError]);

  useEffect(() => {
    setPending({ kind: 'none' });
  }, [location.pathname]);

  useEffect(() => {
    const route = (e: unknown): RoutedToast => {
      // Network errors are surfaced by the connection banner + per-query
      // error states; do not toast.
      if (e instanceof NetworkError) return { kind: 'none' };

      // Auth and permission still drive the existing ErrorAlert modal via
      // the `/error/auth` localStorage flag for now. A follow-up PR
      // replaces both with an imperative AuthOverlay (re-auth without
      // losing form state) and a dedicated permission-denied modal.
      if (e instanceof UnauthenticatedError) {
        setAuthError(AuthError.Unauthenticated);
        return { kind: 'none' };
      }

      if (e instanceof PermissionDeniedError) {
        setAuthError(AuthError.PermissionDenied);
        return { kind: 'none' };
      }

      if (e instanceof InternalServerError) {
        Bugsnag.notify(e);
        const message = e.detail ?? t('error.general-query-error');
        return message.length > 100
          ? { kind: 'detail', message }
          : { kind: 'short', message };
      }

      if (e instanceof BadUserInputError) {
        return { kind: 'short', message: e.detail ?? e.message };
      }

      // Unknown error — likely a bug in a hook throwing something other
      // than the typed error classes. Treat as internal.
      const message = (e as Error)?.message ?? t('error.general-query-error');
      return { kind: 'short', message };
    };

    const currentDefaults = client.getDefaultOptions();
    client.setDefaultOptions({
      queries: {
        ...currentDefaults.queries,
        notifyOnChangeProps: 'tracked',
        onError: e => setPending(route(e)),
      },
      mutations: {
        ...currentDefaults.mutations,
        onError: e => setPending(route(e)),
      },
    });
  }, []);

  return <></>;
};
