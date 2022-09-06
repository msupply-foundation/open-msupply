import { useEffect } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import { UserPermissionNodePermission } from '../../types/schema';
import { AuthError, useAuthContext } from '../AuthContext';
import { LocalStorage } from '../../localStorage';
import { useNavigate } from 'react-router-dom';
import { RouteBuilder } from '../../utils/navigation';

export const usePermissionCheck = (
  permission: UserPermissionNodePermission
) => {
  const { userHasPermission } = useAuthContext();
  const navigate = useNavigate();
  useEffect(() => {
    if (!userHasPermission(permission)) {
      LocalStorage.setItem('/auth/error', AuthError.PermissionDenied);
      LocalStorage.addListener<boolean>((key, value) => {
        if (key === '/auth/error') {
          if (!value) navigate(RouteBuilder.create(AppRoute.Dashboard).build());
        }
      });
    }
  }, []);
};
