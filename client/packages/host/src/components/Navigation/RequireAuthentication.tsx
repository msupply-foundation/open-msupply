import {
  Navigate,
  useAuthContext,
  useLocation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import React from 'react';

export const RequireAuthentication = ({ children }) => {
  const { token } = useAuthContext();
  const location = useLocation();
  // const isProduction = process.env['NODE_ENV'] === 'production';

  // if (!token) && isProduction) {
  if (!token) {
    return (
      <Navigate to={`/${AppRoute.Login}`} state={{ from: location }} replace />
    );
  }

  return children;
};
