import { useCallback, useEffect, useState } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { create } from 'zustand';
import { useTranslation } from '@common/intl';
import { Location, useConfirmationModal } from '@openmsupply-client/common';

/**
 * useConfirmOnLeaving is a hook that will prompt the user if they try to
 * navigate away from, or refresh the page, when there are unsaved changes.
 */
export const useConfirmOnLeaving = (key: string, options?: BlockerOptions) => {
  const { blocking, setBlocking, clearKey } = useBlockNavigationState();

  // Register the key for blocking navigation
  useEffect(() => {
    setBlocking(key, false, options);

    // Cleanup
    return () => clearKey(key);
  }, []);

  const isDirty = blocking.get(key)?.shouldBlock ?? false;
  const setIsDirty = (dirty: boolean) => setBlocking(key, dirty, options);

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
  const [activeBlocker, setActiveBlocker] = useState<BlockingState | null>(
    null
  );

  const showConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-cancel-generic'),
  });

  const blockers: BlockingState[] = Array.from(blocking.values());
  const shouldBlock = blockers.some(b => b.shouldBlock);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    for (const b of blockers) {
      // If there is a custom check on one of the registered blockers, use that
      if (b.options?.customCheck) {
        setActiveBlocker(b);
        return b.options.customCheck(currentLocation, nextLocation);
      }

      if (b.shouldBlock && currentLocation.pathname !== nextLocation.pathname) {
        // Set the blocker that is blocking navigation, so we can show the correct modal content
        setActiveBlocker(b);
        return true;
      }
    }

    return false;
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
      showConfirmation({
        onConfirm: blocker.proceed,
        message: activeBlocker?.options?.blockingMessage,
      });
    }
  }, [blocker]);
};

interface BlockerOptions {
  /**
   * Only one registered customCheck will be used at a time, the first one,
   * even if multiple blockers are registered
   */
  customCheck?: (currentLocation: Location, nextLocation: Location) => boolean;
  blockingMessage?: string;
}

interface BlockingState {
  shouldBlock: boolean;
  options?: BlockerOptions;
}
interface BlockNavigationControl {
  blocking: Map<string, BlockingState>;
  setBlocking: (
    key: string,
    blocking: boolean,
    options?: BlockerOptions
  ) => void;
  clearKey: (key: string) => void;
}

const useBlockNavigationState = create<BlockNavigationControl>(set => {
  return {
    blocking: new Map(),
    setBlocking: (key, blocking, options) => {
      set(state => {
        const blockingState = new Map(state.blocking);
        blockingState.set(key, { shouldBlock: blocking, options });
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
