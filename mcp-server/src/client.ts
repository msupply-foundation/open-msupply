import { GraphQLClient, gql } from 'graphql-request';
import { Config } from './config.js';

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

function wrapConnectionError(error: unknown, url: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? (error.cause as Error)?.message ?? '' : '';

  // Node.js fetch throws TypeError with "fetch failed" when it can't connect
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

  // Self-signed certificate errors
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

  // DNS / hostname resolution
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

  constructor(config: Config) {
    this.config = config;
    this.graphqlUrl = `${config.url}/graphql`;
    this.graphqlClient = new GraphQLClient(this.graphqlUrl);
  }

  private async authenticate(): Promise<void> {
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

      // Detect server still initialising (schema doesn't have authToken yet)
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
      // Re-authenticate on auth errors and retry once
      const message =
        error instanceof Error ? error.message : String(error);
      if (message.includes('401') || message.includes('Unauthenticated')) {
        this.token = null;
        await this.authenticate();
        return await this.graphqlClient.request<T>(document, variables);
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
}
