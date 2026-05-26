/**
 * No-op compatibility shim.
 *
 * Previously this hook tracked JWT expiry client-side and called the `refreshToken` mutation
 * when within 5 minutes of expiry. With session-based auth the server slides the session forward
 * on every authenticated request, so there is nothing for the client to do.
 *
 * The hook is kept (rather than ripped out) so the many existing call sites don't churn. It can
 * be deleted entirely in a follow-up cleanup PR.
 */
export const useRefreshToken = (_onTimeout?: () => void) => {
  return { refreshToken: () => {} };
};
