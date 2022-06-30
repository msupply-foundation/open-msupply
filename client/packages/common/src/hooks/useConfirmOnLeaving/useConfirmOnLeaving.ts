import { useEffect } from 'react';

// Note: if the unsaved condition can be navigated away from using react-router
// then this hook won't catch the navigation action
// you will need to use the `Prompt` component instead ( or usePrompt or useBlocker )
// however, these weren't implemented in react-router-dom v6 at the time of implementation
export const useConfirmOnLeaving = (isUnsaved: boolean | undefined) => {
  const promptUser = (e: BeforeUnloadEvent) => {
    // Cancel the event
    e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
    // Chrome requires returnValue to be set
    e.returnValue = '';
  };

  useEffect(() => {
    if (isUnsaved) {
      window.addEventListener('beforeunload', promptUser, { capture: true });
    } else {
      window.removeEventListener('beforeunload', promptUser, { capture: true });
    }
    return () =>
      window.removeEventListener('beforeunload', promptUser, { capture: true });
  }, [isUnsaved]);
};
