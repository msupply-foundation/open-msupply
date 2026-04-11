import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { OmSupplyClient } from '../client.js';
import { paginationVars, formatListResult, formatRecord } from '../types.js';

const ITEMS_QUERY = gql`
  query items(
    $first: Int
    $offset: Int
    $key: ItemSortFieldInput!
    $desc: Boolean
    $filter: ItemFilterInput
    $storeId: String!
  ) {
    items(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on ItemConnector {
        __typename
        totalCount
        nodes {
          id
          code
          name
          unitName
          isVaccine
          defaultPackSize
          type
          availableStockOnHand(storeId: $storeId)
          stats(storeId: $storeId) {
            averageMonthlyConsumption
            availableStockOnHand
            availableMonthsOfStockOnHand
          }
        }
      }
    }
  }
`;

const ITEM_BY_ID_QUERY = gql`
  query itemById($storeId: String!, $itemId: String!) {
    items(
      storeId: $storeId
      filter: { id: { equalTo: $itemId }, isActive: true }
    ) {
      ... on ItemConnector {
        __typename
        totalCount
        nodes {
          id
          code
          name
          unitName
          isVaccine
          defaultPackSize
          type
          strength
          doses
          volumePerPack
          weight
          availableStockOnHand(storeId: $storeId)
          stats(storeId: $storeId) {
            averageMonthlyConsumption
            availableStockOnHand
            availableMonthsOfStockOnHand
            totalConsumption
            stockOnHand
          }
          availableBatches(storeId: $storeId) {
            totalCount
            nodes {
              id
              batch
              expiryDate
              availableNumberOfPacks
              packSize
              costPricePerPack
              sellPricePerPack
              locationName
              supplierName
              onHold
            }
          }
        }
      }
    }
  }
`;

interface ItemsResponse {
  items: {
    __typename: string;
    totalCount: number;
    nodes: Array<Record<string, unknown>>;
  };
}

export function registerItemTools(server: McpServer, client: OmSupplyClient) {
  server.tool(
    'search_items',
    'Search for items (products/medicines) by name or code. Returns item details including available stock on hand and consumption stats.',
    {
      search: z
        .string()
        .optional()
        .describe('Search term to match against item name or code'),
      code: z
        .string()
        .optional()
        .describe('Filter by exact item code'),
      isVaccine: z
        .boolean()
        .optional()
        .describe('Filter to only vaccine items'),
      first: z
        .number()
        .optional()
        .describe('Max results to return (default 25)'),
      offset: z
        .number()
        .optional()
        .describe('Number of results to skip for pagination'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ search, code, isVaccine, first, offset, storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);
      const pagination = paginationVars(first, offset);

      const filter: Record<string, unknown> = { isActive: true };
      if (search) filter.codeOrName = { like: search };
      if (code) filter.code = { equalTo: code };
      if (isVaccine !== undefined) filter.isVaccine = isVaccine;

      const data = await client.query<ItemsResponse>(ITEMS_QUERY, {
        ...pagination,
        key: 'name',
        desc: false,
        filter,
        storeId: resolvedStoreId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatListResult(
              'items',
              data.items.nodes,
              data.items.totalCount,
              pagination.first,
              pagination.offset
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'get_item',
    'Get detailed information about a specific item by its ID, including available batches and stock statistics.',
    {
      itemId: z.string().describe('The item ID to look up'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ itemId, storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);

      const data = await client.query<ItemsResponse>(ITEM_BY_ID_QUERY, {
        storeId: resolvedStoreId,
        itemId,
      });

      if (data.items.totalCount === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `No item found with ID: ${itemId}`,
            },
          ],
          isError: true,
        };
      }

      const item = data.items.nodes[0];
      return {
        content: [
          {
            type: 'text' as const,
            text: `Item details:\n${formatRecord(item)}`,
          },
        ],
      };
    }
  );
}
