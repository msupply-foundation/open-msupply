import { useAuthContext } from '../AuthContext';
import { useDisabledNotificationToast } from '@common/components';
import { UserPermission } from '@common/types';

export const useCallbackWithPermission = (
  permission: UserPermission,
  callback: () => void,
  message?: string
) => {
  const { userHasPermission } = useAuthContext();
  const showDisabledNotification = useDisabledNotificationToast(message);

  return () => {
    if (userHasPermission(permission)) callback();
    else showDisabledNotification();
  };
};
