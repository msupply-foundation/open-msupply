import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult } from '../../types.js';

export function stockQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'get_stock_lines',
      category: 'stock',
      kind: 'query',
      description:
        'Get stock lines with optional filtering by item. Shows batch-level stock details.',
      schema: {
        itemId: z
          .string()
          .optional()
          .describe('Filter by item ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
        first: z.number().optional().describe('Number of results to return (default 25)'),
        offset: z.number().optional().describe('Offset for pagination (default 0)'),
        sortBy: z
          .enum(['ExpiryDate', 'NumberOfPacks', 'ItemCode', 'ItemName', 'Batch', 'PackSize'])
          .optional()
          .describe('Field to sort by'),
        desc: z.boolean().optional().describe('Sort descending (default false)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const page = paginationVars(args.first as number | undefined, args.offset as number | undefined);
        const sort = args.sortBy
          ? { key: args.sortBy as string, desc: (args.desc as boolean) ?? false }
          : undefined;
        const filter = args.itemId
          ? { itemId: { equalTo: args.itemId as string } }
          : undefined;

        const query = gql`
          query getStockLines(
            $storeId: String!
            $first: Int
            $offset: Int
            $sort: [StockLineSortInput!]
            $filter: StockLineFilterInput
          ) {
            stockLines(
              storeId: $storeId
              page: { first: $first, offset: $offset }
              sort: $sort
              filter: $filter
            ) {
              ... on StockLineConnector {
                totalCount
                nodes {
                  id
                  itemId
                  batch
                  expiryDate
                  packSize
                  totalNumberOfPacks
                  availableNumberOfPacks
                  costPricePerPack
                  sellPricePerPack
                  onHold
                  locationName
                  supplierName
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
        const data = await client.query<{
          stockLines: {
            totalCount: number;
            nodes: Array<Record<string, unknown>>;
          };
        }>(query, {
          storeId,
          first: page.first,
          offset: page.offset,
          sort: sort ? [sort] : undefined,
          filter,
        });
        return {
          content: [
            {
              type: 'text',
              text: formatListResult(
                'stock lines',
                data.stockLines.nodes,
                data.stockLines.totalCount,
                page.first,
                page.offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_stock_counts',
      category: 'stock',
      kind: 'query',
      description:
        'Get stock count summaries including expired, expiring soon, low stock, and item count breakdowns',
      schema: {
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        // Server expects timezone offset in HOURS (Int). JS getTimezoneOffset
        // returns minutes with the opposite sign convention, so negate and / 60.
        const tzOffset = Math.round(-new Date().getTimezoneOffset() / 60);

        const query = gql`
          query getStockCounts($storeId: String!, $tz: Int!) {
            stockCounts(storeId: $storeId, timezoneOffset: $tz) {
              expired
              expiringSoon
            }
            itemCounts(storeId: $storeId) {
              itemCounts {
                total
                noStock
                lowStock
                highStock
              }
            }
          }
        `;
        const data = await client.query<{
          stockCounts: { expired: number; expiringSoon: number };
          itemCounts: {
            itemCounts: {
              total: number;
              noStock: number;
              lowStock: number;
              highStock: number;
            };
          };
        }>(query, { storeId, tz: tzOffset });

        const sc = data.stockCounts;
        const ic = data.itemCounts.itemCounts;
        const lines = [
          'Stock Counts:',
          `  Expired: ${sc.expired}`,
          `  Expiring soon: ${sc.expiringSoon}`,
          '',
          'Item Counts:',
          `  Total items: ${ic.total}`,
          `  No stock: ${ic.noStock}`,
          `  Low stock: ${ic.lowStock}`,
          `  High stock (>6 months): ${ic.highStock}`,
        ];
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      },
    },
  ];
}
