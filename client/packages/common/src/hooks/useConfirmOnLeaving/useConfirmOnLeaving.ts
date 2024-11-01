import { useCallback, useContext, useEffect } from 'react';
import { BlockerFunction, useBeforeUnload, useBlocker } from 'react-router-dom';
import { useTranslation } from '@common/intl';
import { ConfirmationModalContext } from '@openmsupply-client/common'; // '@common/components';

/** useConfirmOnLeaving is a hook that will prompt the user if they try to navigate away from,
 *  or refresh the page, when there are unsaved changes.
 * */
export const useConfirmOnLeaving = (isUnsaved?: boolean) => {
  const t = useTranslation();
  const customConfirm = (onOk: () => void) => {
    setOnConfirm(onOk);
    showConfirmation();
  };

  const { setOpen, setMessage, setOnConfirm, setTitle } = useContext(
    ConfirmationModalContext
  );

  const showConfirmation = useCallback(() => {
    setMessage(t('heading.are-you-sure'));
    setTitle(t('messages.confirm-cancel-generic'));
    setOpen(true);
  }, [setMessage, setTitle, setOpen]);

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) => {
      if (!!isUnsaved && currentLocation.pathname !== nextLocation.pathname) {
        showConfirmation();
        return true;
      }
      return false;
    },
    [isUnsaved, showConfirmation]
  );

  const blocker = useBlocker(shouldBlock);

  // handle page refresh events
  useBeforeUnload(
    useCallback(
      event => {
        // Cancel the refresh
        if (isUnsaved) event.preventDefault();
      },
      [isUnsaved]
    ),
    { capture: true }
  );

  // Reset the blocker if the dirty state changes
  useEffect(() => {
    if (blocker.state === 'blocked' && !isUnsaved) {
      blocker.reset();
    }
  }, [blocker, isUnsaved]);

  // update the onConfirm function when the blocker changes
  useEffect(() => {
    setOnConfirm(() => {
      blocker?.proceed?.();
    });
  }, [blocker]);

  return { showConfirmation: customConfirm };
};
