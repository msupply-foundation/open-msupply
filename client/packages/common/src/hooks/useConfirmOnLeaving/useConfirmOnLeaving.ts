import { useContext, useEffect, useRef } from 'react';
import { UNSAFE_NavigationContext as NavigationContext } from 'react-router-dom';
import { useTranslation } from '@common/intl';

// Ideally we'd use the `Prompt` component instead ( or usePrompt or useBlocker ) to prompt when navigating away using react-router
// however, these weren't implemented in react-router-dom v6 at the time of implementation
export const useConfirmOnLeaving = (isUnsaved?: boolean) => {
  const unblockRef = useRef<any>(null);
  const { navigator } = useContext(NavigationContext);
  const t = useTranslation();

  const promptUser = (e: BeforeUnloadEvent) => {
    // Cancel the event
    e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    // Chrome requires returnValue to be set
    e.returnValue = '';
  };

  const showConfirmation = (onOk: () => void) => {
    if (
      confirm(
        `${t('heading.are-you-sure')}\n${t('messages.confirm-cancel-generic')}`
      )
    ) {
      onOk();
    }
  };

  useEffect(() => {
    if (isUnsaved) {
      window.addEventListener('beforeunload', promptUser, { capture: true });
      const push = navigator.push;

      navigator.push = (...args: Parameters<typeof push>) => {
        showConfirmation(() => {
          push(...args);
        });
      };

      return () => {
        navigator.push = push;
      };
    } else {
      window.removeEventListener('beforeunload', promptUser, { capture: true });
      unblockRef.current?.();
    }
    return () => {
      window.removeEventListener('beforeunload', promptUser, { capture: true });
      unblockRef.current?.();
    };
  }, [navigator, isUnsaved]);
};
