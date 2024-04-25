import { useNotification } from '@common/hooks';
import { useTranslation } from '@common/intl';

/**
 * Display a notification that the user is not allowed to perform an action
 * Uses a toast to display the notification; for longer messages use the useDisabledNotificationPopover
 * @param message string: message to display; defaults to 'Permission denied'
 * @returns function to show a toast
 */
export const useDisabledNotificationToast = (message?: string) => {
  const { info } = useNotification();
  const t = useTranslation();

  return info(message ?? t('auth.permission-denied'));
};
