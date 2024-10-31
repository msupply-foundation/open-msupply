import { useContext, useEffect, useRef } from 'react';
import {
  UNSAFE_NavigationContext as NavigationContext,
  useBlocker,
} from 'react-router-dom';
import { useTranslation } from '@common/intl';
import { useToggle } from '../useToggle';

const promptUser = (e: BeforeUnloadEvent) => {
  // Cancel the event
  e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
  // Chrome requires returnValue to be set
  e.returnValue = '';
};

// Ideally we'd use the `Prompt` component instead ( or usePrompt or useBlocker ) to prompt when navigating away using react-router
// however, these weren't implemented in react-router-dom v6 at the time of implementation
/** useConfirmOnLeaving is a hook that will prompt the user if they try to navigate away from,
 *  or refresh the page, when there are unsaved changes. Be careful when using within a tab component though
 *  these are unloaded, but the event handler is at the window level, and so doesn't care
 * */
export const useConfirmOnLeaving = (isUnsaved?: boolean) => {
  const unblockRef = useRef<any>(null);
  const { navigator } = useContext(NavigationContext);
  const t = useTranslation();
  const { isOn, toggle } = useToggle();
  const showConfirmation = (onOk: () => void) => {
    if (
      confirm(
        `${t('heading.are-you-sure')}\n${t('messages.confirm-cancel-generic')}`
      )
    ) {
      onOk();
    }
  };

  let blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !!isUnsaved && currentLocation.pathname !== nextLocation.pathname
  );

  // TODO: the blocker hook should only be called once, wrapping in useCallback should do it?
  // TODO: the .proceed() should navigate us, but it doesn't, you have to click 'back' again. possibly due to the hook being called multiple times?
  // TODO: replace the confirm with a nice modal - requires a bit of refactoring here
  // console.log('blocker', blocker.state);
  if (blocker.state === 'blocked') {
    if (confirm('time to leave?')) {
      blocker.proceed();
      // console.log(blocker.location.pathname);
    } else {
      blocker.reset();
    }
  }

  useEffect(() => {
    // note that multiple calls to addEventListener don't result in multiple event listeners being added
    // since the method called is idempotent. However, I didn't want to rely on the implementation details
    // so have the toggle state to ensure we only add/remove the event listener once
    if (isUnsaved && !isOn) {
      window.addEventListener('beforeunload', promptUser, { capture: true });
      toggle();
      const push = navigator.push;

      navigator.push = (...args: Parameters<typeof push>) => {
        showConfirmation(() => {
          push(...args);
        });
      };

      return () => {
        navigator.push = push;
      };
    }
    if (!isUnsaved && isOn) {
      window.removeEventListener('beforeunload', promptUser, { capture: true });
      toggle();
      unblockRef.current?.();
    }
  }, [isUnsaved]);

  // always remove the event listener on unmount, and don't check the toggle
  // which would be trapped in a stale closure
  useEffect(
    () => () => {
      window.removeEventListener('beforeunload', promptUser, {
        capture: true,
      });
      unblockRef.current?.();
    },
    []
  );

  return { showConfirmation };
};
