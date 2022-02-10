import {
  Navigate,
  useLocalStorage,
  useLocation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import React from 'react';

export const RequireAuthentication = ({ children }) => {
  const [authToken] = useLocalStorage('/authentication/token');
  const location = useLocation();
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (!authToken && isProduction) {
    return (
      <Navigate to={`/${AppRoute.Login}`} state={{ from: location }} replace />
    );
  }

  return children;
};
