import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult, formatRecord } from '../../types.js';

export function itemQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'search_items',
      category: 'items',
      kind: 'query',
      description:
        'Search for items by code or name. Returns a paginated list of matching items.',
      schema: {
        search: z.string().describe('Search term to match against item code or name'),
        storeId: z.string().optional().describe('Store ID (uses active store if not provided)'),
        first: z.number().optional().describe('Number of results to return (default 25)'),
        offset: z.number().optional().describe('Offset for pagination (default 0)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const page = paginationVars(args.first as number | undefined, args.offset as number | undefined);
        const query = gql`
          query searchItems(
            $storeId: String!
            $first: Int
            $offset: Int
            $filter: ItemFilterInput
          ) {
            items(storeId: $storeId, page: { first: $first, offset: $offset }, filter: $filter) {
              ... on ItemConnector {
                totalCount
                nodes {
                  id
                  code
                  name
                  unitName
                }
              }
            }
          }
        `;
        const data = await client.query<{
          items: {
            totalCount: number;
            nodes: Array<{ id: string; code: string; name: string; unitName: string | null }>;
          };
        }>(query, {
          storeId,
          first: page.first,
          offset: page.offset,
          filter: { codeOrName: { like: args.search as string } },
        });
        return {
          content: [
            {
              type: 'text',
              text: formatListResult(
                'items',
                data.items.nodes,
                data.items.totalCount,
                page.first,
                page.offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_item',
      category: 'items',
      kind: 'query',
      description:
        'Get detailed information about an item including available stock batches',
      schema: {
        id: z.string().describe('The item ID'),
        storeId: z.string().optional().describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const query = gql`
          query getItem($storeId: String!, $filter: ItemFilterInput) {
            items(storeId: $storeId, filter: $filter) {
              ... on ItemConnector {
                nodes {
                  id
                  code
                  name
                  unitName
                  strength
                  defaultPackSize
                  isVaccine
                  availableBatches(storeId: $storeId) {
                    totalCount
                    nodes {
                      id
                      batch
                      expiryDate
                      packSize
                      totalNumberOfPacks
                      availableNumberOfPacks
                      sellPricePerPack
                      costPricePerPack
                      onHold
                      locationName
                    }
                  }
                }
              }
            }
          }
        `;
        const data = await client.query<{
          items: {
            nodes: Array<{
              id: string;
              code: string;
              name: string;
              unitName: string | null;
              strength: string | null;
              defaultPackSize: number;
              isVaccine: boolean;
              availableBatches: {
                totalCount: number;
                nodes: Array<Record<string, unknown>>;
              };
            }>;
          };
        }>(query, {
          storeId,
          filter: { id: { equalTo: args.id as string } },
        });
        const nodes = data.items.nodes;
        if (nodes.length === 0) {
          return {
            content: [{ type: 'text', text: `No item found with ID: ${args.id}` }],
            isError: true,
          };
        }
        const item = nodes[0];
        const lines = [
          `Item details:`,
          `  id: ${item.id}`,
          `  code: ${item.code}`,
          `  name: ${item.name}`,
          `  unitName: ${item.unitName}`,
          `  strength: ${item.strength ?? ''}`,
          `  defaultPackSize: ${item.defaultPackSize}`,
          `  isVaccine: ${item.isVaccine}`,
          `  availableBatches: ${item.availableBatches.totalCount} batch(es)`,
        ];
        if (item.availableBatches.nodes.length > 0) {
          lines.push('');
          for (const batch of item.availableBatches.nodes) {
            lines.push(formatRecord(batch));
            lines.push('');
          }
        }
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      },
    },
    {
      name: 'get_item_ledger',
      category: 'items',
      kind: 'query',
      description:
        'Get stock movement ledger for an item showing transactions and running balance',
      schema: {
        itemId: z.string().describe('The item ID to get ledger for'),
        storeId: z.string().optional().describe('Store ID (uses active store if not provided)'),
        first: z.number().optional().describe('Number of results to return (default 25)'),
        offset: z.number().optional().describe('Offset for pagination (default 0)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const page = paginationVars(args.first as number | undefined, args.offset as number | undefined);
        const query = gql`
          query getItemLedger(
            $storeId: String!
            $first: Int
            $offset: Int
            $filter: ItemLedgerFilterInput
          ) {
            itemLedger(
              storeId: $storeId
              page: { first: $first, offset: $offset }
              filter: $filter
            ) {
              ... on ItemLedgerConnector {
                totalCount
                nodes {
                  id
                  itemId
                  name
                  datetime
                  movementInUnits
                  numberOfPacks
                  packSize
                  balance
                  invoiceType
                  invoiceStatus
                  invoiceNumber
                  batch
                  expiryDate
                }
              }
            }
          }
        `;
        const data = await client.query<{
          itemLedger: {
            totalCount: number;
            nodes: Array<Record<string, unknown>>;
          };
        }>(query, {
          storeId,
          first: page.first,
          offset: page.offset,
          filter: { itemId: { equalTo: args.itemId as string } },
        });
        return {
          content: [
            {
              type: 'text',
              text: formatListResult(
                'ledger entries',
                data.itemLedger.nodes,
                data.itemLedger.totalCount,
                page.first,
                page.offset
              ),
            },
          ],
        };
      },
    },
  ];
}
