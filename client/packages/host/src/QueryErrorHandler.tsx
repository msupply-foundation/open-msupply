import React, { useEffect, useState } from 'react';
import Bugsnag from '@bugsnag/js';
import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';
import {
  BadUserInputError,
  InternalServerError,
  NetworkError,
  PermissionDeniedError,
  UnauthenticatedError,
  useAlertModal,
  useAuthOverlay,
  useLocation,
  useQueryClient,
} from '@openmsupply-client/common';

// Background queries on the dashboard that should not raise a toast when
// permission is denied; the user is already informed by the page-level
// query that landed them on the page in the first place.
//
// TODO: replace with `meta: { silent: true }` opt-in on each hook.
const SILENT_PERMISSION_DENIED_PATHS = new Set([
  'reports',
  'stockCounts',
  'inboundShipmentCounts',
  'inboundShipmentExternalCounts',
  'outboundShipmentCounts',
  'itemCounts',
  'requisitionCounts',
  'temperatureNotifications',
]);

const isSilentPermissionDenied = (e: PermissionDeniedError): boolean =>
  (e.path ?? []).every(p => SILENT_PERMISSION_DENIED_PATHS.has(p));

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
  const { show: showAuthOverlay, reason: overlayReason } = useAuthOverlay();
  const showPermissionDenied = useAlertModal({
    title: t('auth.alert-title'),
    message: t('auth.permission-denied'),
  });

  useEffect(() => {
    if (pending.kind === 'none') return;
    // Don't pile a toast on top of the re-auth modal — once it's open the
    // user is mid-relogin and the toast would just be noise.
    if (overlayReason) return;
    if (pending.kind === 'detail') {
      errorWithDetail(pending.message)();
    } else {
      error(pending.message)();
    }
    setPending({ kind: 'none' });
  }, [pending, overlayReason]);

  useEffect(() => {
    setPending({ kind: 'none' });
  }, [location.pathname]);

  useEffect(() => {
    const route = (e: unknown): RoutedToast => {
      // Network errors are surfaced by the connection banner + per-query
      // error states; do not toast.
      if (e instanceof NetworkError) return { kind: 'none' };

      if (e instanceof UnauthenticatedError) {
        showAuthOverlay('unauthenticated');
        return { kind: 'none' };
      }

      if (e instanceof PermissionDeniedError) {
        if (isSilentPermissionDenied(e)) return { kind: 'none' };
        // Use a modal rather than a toast — permission denied usually
        // means a whole page can't be used, not a single transient
        // failure, so it deserves a more attention-getting surface.
        // TODO: replace with per-page inline UI as part of bucket 3.
        showPermissionDenied();
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
