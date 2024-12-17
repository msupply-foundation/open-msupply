import { useCallback, useContext, useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { useTranslation } from '@common/intl';
import { ConfirmationModalContext, Location } from '@openmsupply-client/common';

/**
 * useConfirmOnLeaving is a hook that will prompt the user if they try to
 * navigate away from, or refresh the page, when there are unsaved changes.
 */
export const useConfirmOnLeaving = (
  isUnsaved?: boolean,
  customCheck?: (currentLocation: Location, nextLocation: Location) => boolean
) => {
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

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (customCheck) return customCheck(currentLocation, nextLocation);
    return !!isUnsaved && currentLocation.pathname !== nextLocation.pathname;
  });

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

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setOnConfirm(blocker.proceed);
      showConfirmation();
    }
  }, [blocker]);

  return { showConfirmation: customConfirm };
};
