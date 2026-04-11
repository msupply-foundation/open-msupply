import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { OmSupplyClient } from '../client.js';
import { paginationVars, formatListResult, formatRecord } from '../types.js';

const STORES_QUERY = gql`
  query stores($first: Int, $offset: Int, $filter: StoreFilterInput) {
    stores(
      page: { first: $first, offset: $offset }
      filter: $filter
      sort: { key: name }
    ) {
      ... on StoreConnector {
        __typename
        totalCount
        nodes {
          id
          code
          storeName
        }
      }
    }
  }
`;

const STORE_QUERY = gql`
  query store($id: String!) {
    store(id: $id) {
      ... on StoreNode {
        __typename
        id
        code
        storeName
      }
      ... on NodeError {
        __typename
        error {
          description
        }
      }
    }
  }
`;

const API_VERSION_QUERY = gql`
  query apiVersion {
    apiVersion
  }
`;

interface StoresResponse {
  stores: {
    __typename: string;
    totalCount: number;
    nodes: Array<{
      id: string;
      code: string;
      storeName: string;
    }>;
  };
}

interface StoreResponse {
  store:
    | { __typename: 'StoreNode'; id: string; code: string; storeName: string }
    | { __typename: 'NodeError'; error: { description: string } };
}

interface ApiVersionResponse {
  apiVersion: string;
}

export function registerStoreTools(server: McpServer, client: OmSupplyClient) {
  server.tool(
    'list_stores',
    'List all available stores in the Open mSupply instance. Use this to discover store IDs needed by other tools.',
    {
      first: z
        .number()
        .optional()
        .describe('Max number of results to return (default 25)'),
      offset: z
        .number()
        .optional()
        .describe('Number of results to skip for pagination'),
    },
    async ({ first, offset }) => {
      const pagination = paginationVars(first, offset);
      const data = await client.query<StoresResponse>(STORES_QUERY, pagination);

      return {
        content: [
          {
            type: 'text' as const,
            text: formatListResult(
              'stores',
              data.stores.nodes,
              data.stores.totalCount,
              pagination.first,
              pagination.offset
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'get_store',
    'Get details of a specific store by its ID.',
    {
      id: z.string().describe('The store ID'),
    },
    async ({ id }) => {
      const data = await client.query<StoreResponse>(STORE_QUERY, { id });

      if (data.store.__typename === 'NodeError') {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${data.store.error.description}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Store details:\n${formatRecord(data.store)}`,
          },
        ],
      };
    }
  );

  server.tool(
    'get_server_info',
    'Get the Open mSupply server version and connection status.',
    {},
    async () => {
      const data =
        await client.query<ApiVersionResponse>(API_VERSION_QUERY);

      const storeId = client.getStoreId();

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              `Open mSupply Server Info:`,
              `  API Version: ${data.apiVersion}`,
              `  Configured Store ID: ${storeId || '(none - use list_stores to find one)'}`,
            ].join('\n'),
          },
        ],
      };
    }
  );
}
