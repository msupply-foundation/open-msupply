import { useMemo } from 'react';
import { usePluginProvider } from '../components';

export const usePluginEvents = () => {
  const addEventListener = usePluginProvider(state => state.addEventListener);
  const removeEventListener = usePluginProvider(
    state => state.removeEventListener
  );
  const dispatchEvent = usePluginProvider(state => state.dispatchEvent);

  return useMemo(
    () => ({
      addEventListener,
      dispatchEvent,
      removeEventListener,
    }),
    [addEventListener, dispatchEvent, removeEventListener]
  );
};
