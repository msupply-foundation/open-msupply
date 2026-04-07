import React, { FC, useEffect } from 'react';
import { useInitialisationStatus } from '../api/hooks';
import { PropsWithChildrenOnly } from '@common/types';
import { setAuthCookieSuffix } from './AuthContext';

/**
 * Fetches the server's cookie_suffix from initialisationStatus and configures
 * the auth cookie name before AuthProvider mounts.
 *
 * Must be placed above AuthProvider in the component tree and inside a Suspense
 * boundary + GqlProvider.
 */
export const CookieConfigProvider: FC<PropsWithChildrenOnly> = ({
  children,
}) => {
  const { data } = useInitialisationStatus(false, true);
  const cookieSuffix = data?.cookieSuffix;

  // Set cookie name synchronously on first render so AuthProvider reads
  // the correct cookie when it mounts. useEffect runs after paint, which
  // would be too late for the initial cookie read.
  setAuthCookieSuffix(cookieSuffix);

  // Also keep it in sync if the value ever changes (e.g. query refetch).
  useEffect(() => {
    setAuthCookieSuffix(cookieSuffix);
  }, [cookieSuffix]);

  return <>{children}</>;
};
