import { UserPermission } from '../../types/schema';
import { AuthError, useAuthContext } from '../AuthContext';
import { useLocalStorage } from '../../localStorage';

export const useCheckPermissionWithError = (permission: UserPermission) => {
  const { userHasPermission } = useAuthContext();
  const [, setError] = useLocalStorage('/error/auth');

  const checkPermissionDenied = () => {
    if (!userHasPermission(permission)) {
      setError(AuthError.PermissionDenied);
    }
    return !userHasPermission(permission);
  };

  return checkPermissionDenied;
};
