import React, { FC, useEffect } from 'react';
import {
  useAuthContext,
  useLocation,
  useNavigate,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const RequireAuthentication: FC = ({ children }) => {
  const { token } = useAuthContext();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate(`/${AppRoute.Login}`, {
        replace: true,
        state: { from: location },
      });
    }
  }, []);

  return <>{children}</>;
};
