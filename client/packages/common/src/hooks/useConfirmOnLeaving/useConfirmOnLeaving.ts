import { useCallback, useContext, useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { create } from 'zustand';
import { useTranslation } from '@common/intl';
import { ConfirmationModalContext, Location } from '@openmsupply-client/common';

/**
 * useConfirmOnLeaving is a hook that will prompt the user if they try to
 * navigate away from, or refresh the page, when there are unsaved changes.
 */
export const useConfirmOnLeaving = (
  key: string,
  customCheck?: (currentLocation: Location, nextLocation: Location) => boolean
) => {
  const { blocking, setBlocking, clearKey } = useBlockNavigationState();

  // Register the key for blocking navigation
  useEffect(() => {
    setBlocking(key, false, customCheck);

    // Cleanup
    return () => clearKey(key);
  }, []);

  const isDirty = blocking.get(key)?.shouldBlock ?? false;
  const setIsDirty = (dirty: boolean) => setBlocking(key, dirty, customCheck);

  return { isDirty, setIsDirty };
};

/**
 * useBlocker only allows one blocker to be active at a time, despite the fact that
 * we might want to block from multiple sources.
 *
 * So we render this hook in `Site`, at the root of the app, and handle the different
 * blocking conditions with BlockNavigation zustand state
 */
export const useBlockNavigation = () => {
  const t = useTranslation();
  const { blocking } = useBlockNavigationState();

  const { setOpen, setMessage, setOnConfirm, setTitle } = useContext(
    ConfirmationModalContext
  );

  const showConfirmation = useCallback(() => {
    setTitle(t('heading.are-you-sure'));
    setMessage(t('messages.confirm-cancel-generic'));
    setOpen(true);
  }, [setMessage, setTitle, setOpen]);

  const blockers: BlockingState[] = Array.from(blocking.values());
  const shouldBlock = blockers.some(b => b.shouldBlock);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    for (const b of blockers) {
      if (b.customCheck) return b.customCheck(currentLocation, nextLocation);
    }
    return !!shouldBlock && currentLocation.pathname !== nextLocation.pathname;
  });

  // handle page refresh events
  useBeforeUnload(
    useCallback(
      event => {
        // Cancel the refresh
        if (shouldBlock) event.preventDefault();
      },
      [shouldBlock]
    ),
    { capture: true }
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setOnConfirm(blocker.proceed);
      showConfirmation();
    }
  }, [blocker]);
};

interface BlockingState {
  shouldBlock: boolean;
  customCheck?: (currentLocation: Location, nextLocation: Location) => boolean;
}
interface BlockNavigationControl {
  blocking: Map<string, BlockingState>;
  setBlocking: (
    key: string,
    blocking: boolean,
    /**
     * Only one registered customCheck will be used at a time, the first one,
     * even if multiple blockers are registered
     */
    customCheck?: (currentLocation: Location, nextLocation: Location) => boolean
  ) => void;
  clearKey: (key: string) => void;
}

const useBlockNavigationState = create<BlockNavigationControl>(set => {
  return {
    blocking: new Map(),
    setBlocking: (key, blocking, customCheck) => {
      set(state => {
        const blockingState = new Map(state.blocking);
        blockingState.set(key, { shouldBlock: blocking, customCheck });
        return {
          ...state,
          blocking: blockingState,
        };
      });
    },
    clearKey: key => {
      set(state => {
        const blockingState = new Map(state.blocking);
        blockingState.delete(key);
        return {
          ...state,
          blocking: blockingState,
        };
      });
    },
  };
});
