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

export class OmSupplyClient {
  private graphqlClient: GraphQLClient;
  private token: string | null = null;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.graphqlClient = new GraphQLClient(`${config.url}/graphql`);
  }

  private async authenticate(): Promise<void> {
    const data = await this.graphqlClient.request<AuthTokenResponse>(
      AUTH_TOKEN_QUERY,
      {
        username: this.config.username,
        password: this.config.password,
      }
    );

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
      throw error;
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
