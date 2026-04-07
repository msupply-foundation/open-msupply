import React, { FC } from 'react';
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
  setAuthCookieSuffix(data?.cookieSuffix);
  return <>{children}</>;
};
