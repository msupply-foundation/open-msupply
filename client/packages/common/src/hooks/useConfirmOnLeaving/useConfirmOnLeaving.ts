import { useCallback } from 'react';
import { BlockerFunction, useBeforeUnload, useBlocker } from 'react-router-dom';
import { useTranslation } from '@common/intl';

/** useConfirmOnLeaving is a hook that will prompt the user if they try to navigate away from,
 *  or refresh the page, when there are unsaved changes.
 * */
export const useConfirmOnLeaving = (isUnsaved?: boolean) => {
  const t = useTranslation();
  const confirmMessage = `${t('heading.are-you-sure')}\n${t('messages.confirm-cancel-generic')}`;

  const customConfirm = (onOk: () => void) => {
    if (confirm(confirmMessage)) {
      onOk();
    }
  };

  useBlocker(
    useCallback<BlockerFunction>(
      ({ currentLocation, nextLocation }) => {
        if (!!isUnsaved && currentLocation.pathname !== nextLocation.pathname) {
          return !confirm(confirmMessage);
        }
        return false;
      },
      [isUnsaved]
    )
  );

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

  return { showConfirmation: customConfirm };
};
