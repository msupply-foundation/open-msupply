import React, {
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useState,
} from 'react';
import { createRegisteredContext } from 'react-singleton-context';

export type AuthOverlayReason = 'unauthenticated' | 'expired';

interface AuthOverlayControl {
  show: (reason: AuthOverlayReason) => void;
  hide: () => void;
  reason: AuthOverlayReason | null;
}

const noop = () => {};
const defaultControl: AuthOverlayControl = {
  show: noop,
  hide: noop,
  reason: null,
};

const AuthOverlayContext = createRegisteredContext<AuthOverlayControl>(
  'auth-overlay-context',
  defaultControl
);

/**
 * Imperative provider for the "you need to re-authenticate" modal. Replaces
 * the old `/error/auth` LocalStorage flag for the Unauthenticated/Timeout
 * cases. The actual modal UI is rendered by the host package
 * (AuthOverlayModal) so we don't pull host-level deps into common.
 */
export const AuthOverlayProvider: FC<PropsWithChildren> = ({ children }) => {
  const [reason, setReason] = useState<AuthOverlayReason | null>(null);
  const show = useCallback((r: AuthOverlayReason) => setReason(r), []);
  const hide = useCallback(() => setReason(null), []);

  return (
    <AuthOverlayContext.Provider value={{ show, hide, reason }}>
      {children}
    </AuthOverlayContext.Provider>
  );
};

export const useAuthOverlay = (): AuthOverlayControl =>
  useContext(AuthOverlayContext);
