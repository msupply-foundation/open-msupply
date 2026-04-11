import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { OmSupplyClient } from '../client.js';
import { paginationVars, formatListResult } from '../types.js';

const STOCK_LINES_QUERY = gql`
  query stockLines(
    $first: Int
    $offset: Int
    $key: StockLineSortFieldInput!
    $desc: Boolean
    $filter: StockLineFilterInput
    $storeId: String!
  ) {
    stockLines(
      storeId: $storeId
      filter: $filter
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
    ) {
      ... on StockLineConnector {
        __typename
        totalCount
        nodes {
          id
          availableNumberOfPacks
          totalNumberOfPacks
          packSize
          batch
          expiryDate
          costPricePerPack
          sellPricePerPack
          locationName
          supplierName
          onHold
          itemId
          item {
            id
            code
            name
            unitName
          }
        }
      }
    }
  }
`;

const STOCK_COUNTS_QUERY = gql`
  query stockCounts($storeId: String!, $daysTillExpired: Int) {
    stockCounts(storeId: $storeId, daysTillExpired: $daysTillExpired) {
      expired
      expiringSoon
    }
  }
`;

const ITEM_COUNTS_QUERY = gql`
  query itemCounts(
    $storeId: String!
    $lowStockThreshold: Float!
    $highStockThreshold: Float!
  ) {
    itemCounts(
      storeId: $storeId
      lowStockThreshold: $lowStockThreshold
      highStockThreshold: $highStockThreshold
    ) {
      itemCounts {
        lowStock
        noStock
        highStock
        total
      }
    }
  }
`;

const ITEM_LEDGER_QUERY = gql`
  query itemLedger(
    $first: Int
    $offset: Int
    $filter: ItemLedgerFilterInput
    $storeId: String!
  ) {
    itemLedger(
      storeId: $storeId
      filter: $filter
      page: { first: $first, offset: $offset }
    ) {
      ... on ItemLedgerConnector {
        __typename
        totalCount
        nodes {
          id
          datetime
          invoiceNumber
          invoiceType
          invoiceStatus
          name
          batch
          expiryDate
          packSize
          numberOfPacks
          costPricePerPack
          sellPricePerPack
          reason
        }
      }
    }
  }
`;

interface StockLinesResponse {
  stockLines: {
    __typename: string;
    totalCount: number;
    nodes: Array<Record<string, unknown>>;
  };
}

interface StockCountsResponse {
  stockCounts: {
    expired: number;
    expiringSoon: number;
  };
}

interface ItemCountsResponse {
  itemCounts: {
    itemCounts: {
      lowStock: number;
      noStock: number;
      highStock: number;
      total: number;
    };
  };
}

interface ItemLedgerResponse {
  itemLedger: {
    __typename: string;
    totalCount: number;
    nodes: Array<Record<string, unknown>>;
  };
}

export function registerStockTools(server: McpServer, client: OmSupplyClient) {
  server.tool(
    'get_stock_lines',
    'Get current stock levels showing available batches, quantities, expiry dates, and locations. Can filter by item, location, or availability.',
    {
      itemId: z
        .string()
        .optional()
        .describe('Filter stock lines by item ID'),
      search: z
        .string()
        .optional()
        .describe('Search by item code or name'),
      locationId: z
        .string()
        .optional()
        .describe('Filter by location ID'),
      hasStock: z
        .boolean()
        .optional()
        .describe('If true, only show lines with available packs'),
      sortBy: z
        .enum([
          'expiryDate',
          'itemName',
          'itemCode',
          'batch',
          'numberOfPacks',
        ])
        .optional()
        .describe('Sort field (default: itemName)'),
      desc: z.boolean().optional().describe('Sort descending'),
      first: z.number().optional().describe('Max results (default 25)'),
      offset: z.number().optional().describe('Pagination offset'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({
      itemId,
      search,
      locationId,
      hasStock,
      sortBy,
      desc,
      first,
      offset,
      storeId,
    }) => {
      const resolvedStoreId = client.requireStoreId(storeId);
      const pagination = paginationVars(first, offset);

      const filter: Record<string, unknown> = {};
      if (itemId) filter.itemId = { equalTo: itemId };
      if (search) filter.itemCodeOrName = { like: search };
      if (locationId) filter.locationId = { equalTo: locationId };
      if (hasStock) filter.hasPacksInStore = true;

      const sortKeyMap: Record<string, string> = {
        expiryDate: 'expiryDate',
        itemName: 'itemName',
        itemCode: 'itemCode',
        batch: 'batch',
        numberOfPacks: 'numberOfPacks',
      };

      const data = await client.query<StockLinesResponse>(STOCK_LINES_QUERY, {
        ...pagination,
        key: sortKeyMap[sortBy ?? 'itemName'] ?? 'itemName',
        desc: desc ?? false,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        storeId: resolvedStoreId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatListResult(
              'stock lines',
              data.stockLines.nodes,
              data.stockLines.totalCount,
              pagination.first,
              pagination.offset
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'get_stock_counts',
    'Get summary stock counts including expired items and items expiring soon. Useful for a quick overview of stock health.',
    {
      daysTillExpired: z
        .number()
        .optional()
        .describe(
          'Number of days to consider as "expiring soon" threshold (default 30)'
        ),
      lowStockThreshold: z
        .number()
        .optional()
        .describe('Months of stock below which items are "low stock" (default 3)'),
      highStockThreshold: z
        .number()
        .optional()
        .describe('Months of stock above which items are "high stock" (default 6)'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ daysTillExpired, lowStockThreshold, highStockThreshold, storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);

      const [stockData, itemData] = await Promise.all([
        client.query<StockCountsResponse>(STOCK_COUNTS_QUERY, {
          storeId: resolvedStoreId,
          daysTillExpired: daysTillExpired ?? 30,
        }),
        client.query<ItemCountsResponse>(ITEM_COUNTS_QUERY, {
          storeId: resolvedStoreId,
          lowStockThreshold: lowStockThreshold ?? 3,
          highStockThreshold: highStockThreshold ?? 6,
        }),
      ]);

      const counts = itemData.itemCounts.itemCounts;

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              'Stock Summary:',
              '',
              'Item Counts:',
              `  Total items: ${counts.total}`,
              `  No stock: ${counts.noStock}`,
              `  Low stock: ${counts.lowStock}`,
              `  High stock: ${counts.highStock}`,
              '',
              'Expiry:',
              `  Expired batches: ${stockData.stockCounts.expired}`,
              `  Expiring soon (within ${daysTillExpired ?? 30} days): ${stockData.stockCounts.expiringSoon}`,
            ].join('\n'),
          },
        ],
      };
    }
  );

  server.tool(
    'get_item_ledger',
    'Get the transaction history (ledger) for a specific item, showing all stock movements in and out.',
    {
      itemId: z.string().describe('The item ID to get ledger for'),
      first: z.number().optional().describe('Max results (default 25)'),
      offset: z.number().optional().describe('Pagination offset'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ itemId, first, offset, storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);
      const pagination = paginationVars(first, offset);

      const data = await client.query<ItemLedgerResponse>(ITEM_LEDGER_QUERY, {
        ...pagination,
        filter: { itemId: { equalTo: itemId } },
        storeId: resolvedStoreId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatListResult(
              'ledger entries',
              data.itemLedger.nodes,
              data.itemLedger.totalCount,
              pagination.first,
              pagination.offset
            ),
          },
        ],
      };
    }
  );
}
