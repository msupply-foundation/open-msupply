import { useEffect } from 'react';
import { getToken } from '@/app/session';
import { redirectToLogin } from '@/lib/authError';

const IDLE_TIMEOUT_MS = 15 * 60_000; // log out after 15 min of no activity
const THROTTLE_MS = 1_000; // coalesce activity handling to once a second
const ACTIVITY_KEY = 'oms:last-activity'; // cross-tab activity broadcast

// Capture phase + passive so inner scrollers (e.g. the virtualized stocktake
// grid) count as activity and we never block the event.
const LISTENER_OPTS = { capture: true, passive: true } as const;
const ACTIVITY_EVENTS = [
  'mousemove',
  'keydown',
  'pointerdown',
  'wheel',
  'touchstart',
  'scroll',
] as const;

/**
 * Logs the user out after 15 minutes of inactivity. Activity in any tab resets
 * the timer in every tab (via a localStorage ping), so a backgrounded tab won't
 * expire the shared session while the user is working in another.
 */
export function useIdleTimeout() {
  useEffect(() => {
    let timer: number | undefined;
    let lastHandled = 0;

    const logout = () => {
      if (getToken()) redirectToLogin();
    };

    const arm = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(logout, IDLE_TIMEOUT_MS);
    };

    const onLocalActivity = () => {
      const now = Date.now();
      if (now - lastHandled < THROTTLE_MS) return;
      lastHandled = now;
      arm();
      localStorage.setItem(ACTIVITY_KEY, String(now)); // wakes other tabs
    };

    // Fires only in *other* tabs, so any tab's activity re-arms this one.
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACTIVITY_KEY) arm();
    };

    arm();
    ACTIVITY_EVENTS.forEach(e =>
      window.addEventListener(e, onLocalActivity, LISTENER_OPTS),
    );
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearTimeout(timer);
      ACTIVITY_EVENTS.forEach(e =>
        window.removeEventListener(e, onLocalActivity, LISTENER_OPTS),
      );
      window.removeEventListener('storage', onStorage);
    };
  }, []);
}
