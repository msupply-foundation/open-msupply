import React, { FC } from 'react';
import {
  Navigate,
  useAuthContext,
  useLocation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const RequireAuthentication: FC = ({ children }) => {
  const { token } = useAuthContext();
  const location = useLocation();

  if (!token) {
    return (
      <Navigate to={`/${AppRoute.Login}`} state={{ from: location }} replace />
    );
  }

  return <>{children}</>;
};
