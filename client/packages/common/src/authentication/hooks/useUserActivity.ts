import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS: (keyof DocumentEventMap)[] = [
  'mousedown',
  'keydown',
  'touchstart',
];

export const INACTIVITY_TIMEOUT_MINUTES = 30;

export const useUserActivity = () => {
  const lastActivityRef = useRef(Date.now());

  const onActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    ACTIVITY_EVENTS.forEach(event =>
      document.addEventListener(event, onActivity, { passive: true })
    );
    return () => {
      ACTIVITY_EVENTS.forEach(event =>
        document.removeEventListener(event, onActivity)
      );
    };
  }, [onActivity]);

  const isActive = useCallback(() => {
    const elapsed = (Date.now() - lastActivityRef.current) / 1000 / 60;
    return elapsed < INACTIVITY_TIMEOUT_MINUTES;
  }, []);

  return { isActive };
};
