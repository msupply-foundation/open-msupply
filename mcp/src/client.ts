import { GraphQLClient, gql } from 'graphql-request';
import { Config, PermissionConfig } from './config.js';
import { runBrowserAuthFlow } from './browserAuth.js';
import { applyPresetMode, isPresetMode, PermissionsState } from './permissions.js';

const AUTH_TOKEN_QUERY = gql`
  query authToken($username: String!, $password: String!) {
    authToken(password: $password, username: $username) {
      ... on AuthTokenError {
        __typename
        error {
          description
        }
      }
      ... on AuthToken {
        __typename
        token
      }
    }
  }
`;

interface AuthTokenResponse {
  authToken:
    | { __typename: 'AuthToken'; token: string }
    | { __typename: 'AuthTokenError'; error: { description: string } };
}

interface GraphqlErrorEntry {
  message: string;
  path?: (string | number)[];
}

function extractGraphqlErrors(error: unknown): GraphqlErrorEntry[] | null {
  if (!error || typeof error !== 'object') return null;
  const response = (error as { response?: { errors?: GraphqlErrorEntry[] } })
    .response;
  if (response?.errors && Array.isArray(response.errors) && response.errors.length > 0) {
    return response.errors;
  }
  return null;
}

function wrapConnectionError(error: unknown, url: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? (error.cause as Error)?.message ?? '' : '';

  if (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    cause.includes('ECONNREFUSED')
  ) {
    const hint = (cause.includes('::1') || message.includes('::1'))
      ? ` Try using 127.0.0.1 instead of localhost in OMSUPPLY_URL to force IPv4.`
      : '';
    return new Error(
      `Cannot connect to Open mSupply server at ${url}. ` +
        `Is the server running?${hint} (Original error: ${cause || message})`
    );
  }

  if (
    message.includes('CERT') ||
    message.includes('self-signed') ||
    message.includes('certificate') ||
    cause.includes('CERT') ||
    cause.includes('self-signed')
  ) {
    return new Error(
      `SSL certificate error connecting to ${url}. ` +
        `If using self-signed certificates, set OMSUPPLY_ALLOW_SELF_SIGNED=true. ` +
        `(Original error: ${cause || message})`
    );
  }

  if (
    message.includes('ENOTFOUND') ||
    cause.includes('ENOTFOUND')
  ) {
    return new Error(
      `Cannot resolve hostname for ${url}. Check that OMSUPPLY_URL is correct. ` +
        `(Original error: ${cause || message})`
    );
  }

  return error instanceof Error ? error : new Error(message);
}

export class OmSupplyClient {
  private graphqlClient: GraphQLClient;
  private token: string | null = null;
  private config: Config;
  private graphqlUrl: string;
  private pendingBrowserFlow: Promise<void> | null = null;
  private basePermissions: PermissionConfig;
  private permissionsState?: PermissionsState;

  constructor(config: Config, basePermissions: PermissionConfig) {
    this.config = config;
    this.graphqlUrl = config.url ? `${config.url}/graphql` : 'http://unconfigured';
    this.graphqlClient = new GraphQLClient(this.graphqlUrl);
    this.basePermissions = basePermissions;
  }

  /** Wire a PermissionsState so browser-selected preset mode takes effect this session. */
  attachPermissions(state: PermissionsState): void {
    this.permissionsState = state;
  }

  private async ensureCredentials(): Promise<void> {
    if (this.config.url && this.config.username && this.config.password) return;
    if (this.pendingBrowserFlow) return this.pendingBrowserFlow;

    console.error(
      '[open-msupply-mcp] Credentials not fully provided via env. Opening browser for configuration…'
    );
    this.pendingBrowserFlow = runBrowserAuthFlow({
      envOverrides: this.config.envOverrides,
    })
      .then((result) => {
        this.config.url = result.url.replace(/\/$/, '');
        this.config.username = result.username;
        this.config.password = result.password;
        this.graphqlUrl = `${this.config.url}/graphql`;
        this.graphqlClient = new GraphQLClient(this.graphqlUrl);
        if (result.mode && isPresetMode(result.mode) && this.permissionsState) {
          this.permissionsState.set(applyPresetMode(this.basePermissions, result.mode));
          console.error(`[open-msupply-mcp] Applying preset mode: ${result.mode}`);
        }
      })
      .finally(() => {
        this.pendingBrowserFlow = null;
      });
    return this.pendingBrowserFlow;
  }

  private async authenticate(): Promise<void> {
    await this.ensureCredentials();
    let data: AuthTokenResponse;
    try {
      data = await this.graphqlClient.request<AuthTokenResponse>(
        AUTH_TOKEN_QUERY,
        {
          username: this.config.username,
          password: this.config.password,
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes('Unknown field') &&
        message.includes('authToken')
      ) {
        throw new Error(
          `Open mSupply server at ${this.graphqlUrl} is still initialising. ` +
            `The server must complete its initialisation and sync before the MCP server can connect. ` +
            `Check the server status at ${this.config.url} or try again shortly.`
        );
      }

      const graphqlErrors = extractGraphqlErrors(error);
      if (graphqlErrors) {
        const authError = graphqlErrors.find(
          (e) => e.path?.[0] === 'authToken'
        );
        if (authError) {
          if (/internal error/i.test(authError.message)) {
            throw new Error(
              `Open mSupply server at ${this.graphqlUrl} returned an internal error while authenticating user "${this.config.username}". ` +
                `This usually means the server is not fully initialised, the central server is unreachable, or the site is not yet configured. ` +
                `Check the server logs at ${this.config.url} for details.`
            );
          }
          throw new Error(
            `Authentication request to ${this.graphqlUrl} failed: ${authError.message}`
          );
        }
        throw new Error(
          `GraphQL error from ${this.graphqlUrl} during authentication: ${graphqlErrors
            .map((e) => e.message)
            .join('; ')}`
        );
      }

      throw wrapConnectionError(error, this.graphqlUrl);
    }

    if (data.authToken.__typename === 'AuthTokenError') {
      throw new Error(
        `Authentication failed: ${data.authToken.error.description}`
      );
    }

    this.token = data.authToken.token;
    this.graphqlClient.setHeader('Authorization', `Bearer ${this.token}`);
  }

  async query<T>(document: string, variables?: Record<string, unknown>): Promise<T> {
    if (!this.token) {
      await this.authenticate();
    }

    try {
      return await this.graphqlClient.request<T>(document, variables);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : String(error);
      if (message.includes('401') || message.includes('Unauthenticated')) {
        this.token = null;
        await this.authenticate();
        return await this.graphqlClient.request<T>(document, variables);
      }
      const graphqlErrors = extractGraphqlErrors(error);
      if (graphqlErrors) {
        const forbidden = graphqlErrors.every((e) => /forbidden/i.test(e.message));
        const activeStoreId = this.config.storeId;
        const hint = forbidden
          ? ` — the authenticated user does not have access to this store${
              activeStoreId ? ` (${activeStoreId})` : ''
            }. Call list_my_stores to see which stores you can use, then set_active_store with one of those IDs.`
          : '';
        throw new Error(
          `GraphQL error from ${this.graphqlUrl}: ${graphqlErrors
            .map((e) => {
              const path = e.path?.length ? ` (at ${e.path.join('.')})` : '';
              return `${e.message}${path}`;
            })
            .join('; ')}${hint}`
        );
      }
      throw wrapConnectionError(error, this.graphqlUrl);
    }
  }

  getStoreId(): string | undefined {
    return this.config.storeId;
  }

  setStoreId(storeId: string): void {
    this.config.storeId = storeId;
  }

  requireStoreId(providedStoreId?: string): string {
    const storeId = providedStoreId || this.config.storeId;
    if (!storeId) {
      throw new Error(
        'storeId is required. Either set OMSUPPLY_STORE_ID env var or use list_stores to find a store ID and pass it explicitly.'
      );
    }
    return storeId;
  }

  /** Base server URL (no /graphql suffix). Triggers credential setup if not yet configured. */
  async getBaseUrl(): Promise<string> {
    await this.ensureCredentials();
    return this.config.url!;
  }

  /** Authenticated bearer token, refreshing if absent. Used by REST endpoints like /files. */
  async getAuthToken(): Promise<string> {
    if (!this.token) {
      await this.authenticate();
    }
    return this.token!;
  }
}
