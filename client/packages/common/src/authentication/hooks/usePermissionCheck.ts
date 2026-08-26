import { useEffect, useRef } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import { UserPermission } from '../../types/schema';
import { AuthError, useAuthContext } from '../AuthContext';
import { useLocalStorage } from '../../localStorage';
import { useNavigate } from 'react-router-dom';
import { RouteBuilder } from '../../utils/navigation';

export const usePermissionCheck = (
  permission: UserPermission,
  onPermissionDenied?: () => void
) => {
  const { userHasPermission } = useAuthContext();
  const navigate = useNavigate();
  const [error, setError] = useLocalStorage('/error/auth');
  const previous = useRef(error);

  useEffect(() => {
    if (!userHasPermission(permission)) {
      setError(AuthError.PermissionDenied);
    }
  }, []);

  useEffect(() => {
    previous.current = error;
  }, [error]);

  if (previous.current === AuthError.PermissionDenied && !error) {
    if (onPermissionDenied) {
      onPermissionDenied();
    } else {
      navigate(RouteBuilder.create(AppRoute.Dashboard).build());
    }
  }
};
