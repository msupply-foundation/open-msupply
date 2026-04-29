import { useToggle } from '@common/hooks';
import { AppRoute } from '@openmsupply-client/config';
import React, { useEffect } from 'react';
import {
  Location,
  RouteBuilder,
  matchPath,
  useAuthContext,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';
import { AlertModal } from '@common/components';
import { useTranslation } from '@common/intl';

/**
 * Renders a full-screen alert when the user is authenticated but has no
 * store assigned to them. The condition is derived from the auth cookie
 * (token present, no store) rather than a localStorage flag, so it
 * tracks state automatically without anything needing to dispatch.
 *
 * Other error flows that used to live here (Unauthenticated, Timeout,
 * PermissionDenied, ServerError) now go through:
 *   - AuthOverlay (re-auth without losing form state)
 *   - AlertModal triggered by QueryErrorHandler (permission denied)
 *   - ConnectionLostBanner / toasts (network and internal errors)
 */
export const ErrorAlert = () => {
  const navigate = useNavigate();
  const { isOn, toggleOff, toggleOn } = useToggle();
  const t = useTranslation();
  const location = useLocation();
  const { token, store } = useAuthContext();
  const hasNoStore = !!token && !store;

  useEffect(() => {
    if (hasNoStore) toggleOn();
    else toggleOff();
  }, [hasNoStore, toggleOff, toggleOn]);

  // Suppress on auth-flow pages — the user is already in the right place.
  if (
    matchPath(
      RouteBuilder.create(AppRoute.Login).addWildCard().build(),
      location.pathname
    ) ||
    matchPath(
      RouteBuilder.create(AppRoute.Initialise).addWildCard().build(),
      location.pathname
    ) ||
    matchPath(RouteBuilder.create(AppRoute.Android).build(), location.pathname)
  ) {
    return null;
  }

  if (!hasNoStore) return null;

  const onOk = () => {
    const state = {} as { from?: Location };
    navigate(`/${AppRoute.Login}`, { replace: true, state });
  };

  return (
    <AlertModal
      important
      open={isOn}
      title={t('auth.alert-title')}
      message={t('auth.no-store-assigned')}
      onOk={onOk}
    />
  );
};
