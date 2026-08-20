import { Environment } from '@openmsupply-client/config';

/**
 * Single sign-on, as the server describes it (`GET /auth/oidc/config`).
 *
 * Plain REST rather than GraphQL: the login page needs this before it has a session, and keeping it
 * out of the schema means a front end can adopt it without regenerating types.
 *
 * Lives in `common` rather than beside the login page because both halves need it — the login page
 * offers the button (`host`), and `useLogout` (here) has to know whether logging out should also end
 * the provider's session.
 */
export type OidcConfig = {
  enabled: boolean;
  /** Path on the API server that starts the flow. */
  loginUrl: string;
  /**
   * Path on the API server that logs out, ending the identity provider's session too. Null unless
   * the deployment has asked for that — logout is otherwise unchanged.
   */
  logoutUrl?: string | null;
  buttonLabel?: string | null;
};

export const OIDC_DISABLED: OidcConfig = {
  enabled: false,
  loginUrl: '/auth/oidc/login',
  logoutUrl: null,
  buttonLabel: null,
};

/**
 * Never throws, and never reports: a server that doesn't know the endpoint (any release before
 * single sign-on existed) answers 404, which is indistinguishable from "not configured" and must be
 * just as quiet. Either way the password login is untouched.
 */
export const fetchOidcConfig = async (): Promise<OidcConfig> => {
  try {
    const response = await fetch(`${Environment.API_HOST}/auth/oidc/config`);
    if (!response.ok) return OIDC_DISABLED;
    return (await response.json()) as OidcConfig;
  } catch {
    return OIDC_DISABLED;
  }
};

/**
 * Where to send the browser to log out, when the server has said logging out should end the identity
 * provider's session too. Undefined leaves logout exactly as it was.
 *
 * The server decides per session whether the provider is actually involved — a password session is
 * simply revoked and lands back in the app — so no client-side knowledge of how the current session
 * was established is needed.
 */
export const oidcLogoutUrl = (config: OidcConfig): string | undefined => {
  if (!config.enabled || !config.logoutUrl) return undefined;
  const returnTo = `${window.location.origin}${Environment.PUBLIC_PATH}login`;
  return `${Environment.API_HOST}${config.logoutUrl}?redirect=${encodeURIComponent(returnTo)}`;
};

/**
 * Hand the browser over to the server to start the flow.
 *
 * `redirect` names the *login route*, not the app root: this client keeps its own auth state, so the
 * session the server creates has to be adopted there before anything else renders. The server
 * appends `sso=success` — or `oidcError=<slug>` — to whatever it is given.
 *
 * In production the app and the API share an origin, so a path is enough; in development the app is
 * served from its own dev-server origin, so the full URL is needed (the server only honours it if
 * that origin is in its `cors_origins`).
 */
export const startOidcLogin = (loginUrl: string) => {
  const loginPath = `${Environment.PUBLIC_PATH}login`;
  const returnTo =
    window.location.origin === new URL(Environment.API_HOST).origin
      ? loginPath
      : `${window.location.origin}${loginPath}`;

  window.location.assign(
    `${Environment.API_HOST}${loginUrl}?redirect=${encodeURIComponent(returnTo)}`
  );
};
