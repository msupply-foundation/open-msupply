import { useCallback, useEffect, useRef } from 'react';
import { LocalStorage } from '../../localStorage';
import { AuthError, clearAuthState, useAuthContext } from '../AuthContext';
import { usePreferences } from '../api/hooks/usePreferences';
import { useAuthApi } from '../api/hooks';

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'keydown',
  'touchstart',
];

export const useInactivityTimeout = () => {
  const { isAuthenticated } = useAuthContext();
  const { inactivityTimeoutMinutes } = usePreferences();
  const api = useAuthApi();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const timeoutMs = (inactivityTimeoutMinutes ?? 0) * 60 * 1000;

  const onTimeout = useCallback(async () => {
    try {
      await api.get.logout();
    } catch {
      // ignore
    }
    clearAuthState();
    LocalStorage.setItem('/error/auth', AuthError.Timeout);
  }, [api]);

  useEffect(() => {
    if (!isAuthenticated || timeoutMs <= 0) return;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(onTimeout, timeoutMs);
    };

    reset();
    ACTIVITY_EVENTS.forEach(event =>
      document.addEventListener(event, reset, { passive: true })
    );

    return () => {
      if (timer.current) clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach(event =>
        document.removeEventListener(event, reset)
      );
    };
  }, [isAuthenticated, timeoutMs, onTimeout]);
};
