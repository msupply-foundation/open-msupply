import { useEffect } from 'react';
import { AppRoute } from '@openmsupply-client/config';
import { UserPermission } from '../../types/schema';
import { useAuthContext } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { RouteBuilder } from '../../utils/navigation';

/**
 * Redirects the user away from a page they don't have permission to view.
 * Previously this set a global localStorage flag that drove a modal; now
 * it just navigates, since the user can't usefully recover from missing
 * permissions in-place.
 */
export const usePermissionCheck = (
  permission: UserPermission,
  onPermissionDenied?: () => void
) => {
  const { userHasPermission } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (userHasPermission(permission)) return;
    if (onPermissionDenied) {
      onPermissionDenied();
      return;
    }
    navigate(RouteBuilder.create(AppRoute.Dashboard).build());
  }, []);
};
