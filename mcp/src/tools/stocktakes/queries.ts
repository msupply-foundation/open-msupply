import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult, formatRecord } from '../../types.js';

export function stocktakeQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_stocktakes',
      category: 'stocktakes',
      kind: 'query',
      description:
        'List stocktakes with optional filtering by status or description. Returns a paginated list.',
      schema: {
        status: z
          .enum(['NEW', 'FINALISED'])
          .optional()
          .describe('Filter by stocktake status'),
        search: z
          .string()
          .optional()
          .describe('Search by stocktake description (partial, case-insensitive match)'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
        first: z.number().optional().describe('Number of results to return (default 25)'),
        offset: z.number().optional().describe('Offset for pagination (default 0)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const page = paginationVars(args.first as number | undefined, args.offset as number | undefined);

        const filter: Record<string, unknown> = {};
        if (args.status) filter.status = { equalTo: args.status as string };
        if (args.search) filter.description = { like: args.search as string };

        const query = gql`
          query listStocktakes(
            $storeId: String!
            $first: Int
            $offset: Int
            $filter: StocktakeFilterInput
          ) {
            stocktakes(
              storeId: $storeId
              page: { first: $first, offset: $offset }
              filter: $filter
            ) {
              ... on StocktakeConnector {
                totalCount
                nodes {
                  id
                  stocktakeNumber
                  status
                  createdDatetime
                  comment
                  description
                  isLocked
                }
              }
            }
          }
        `;
        const data = await client.query<{
          stocktakes: {
            totalCount: number;
            nodes: Array<Record<string, unknown>>;
          };
        }>(query, {
          storeId,
          first: page.first,
          offset: page.offset,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: formatListResult(
                'stocktakes',
                data.stocktakes.nodes,
                data.stocktakes.totalCount,
                page.first,
                page.offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_stocktake',
      category: 'stocktakes',
      kind: 'query',
      description:
        'Get detailed information about a stocktake including its lines',
      schema: {
        id: z.string().describe('The stocktake ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const query = gql`
          query getStocktake($storeId: String!, $id: String!) {
            stocktake(storeId: $storeId, id: $id) {
              __typename
              ... on StocktakeNode {
                id
                stocktakeNumber
                status
                createdDatetime
                comment
                description
                isLocked
                lines {
                  nodes {
                    id
                    batch
                    expiryDate
                    packSize
                    countedNumberOfPacks
                    snapshotNumberOfPacks
                    item {
                      id
                      code
                      name
                      unitName
                    }
                  }
                }
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
        const data = await client.query<{
          stocktake: {
            __typename: string;
            id?: string;
            stocktakeNumber?: number;
            status?: string;
            createdDatetime?: string;
            comment?: string;
            description?: string;
            isLocked?: boolean;
            lines?: { nodes: Array<Record<string, unknown>> };
            error?: { description: string };
          };
        }>(query, { storeId, id: args.id as string });

        const result = data.stocktake;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching stocktake: ${result.error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        const lines = [
          'Stocktake details:',
          `  id: ${result.id}`,
          `  stocktakeNumber: ${result.stocktakeNumber}`,
          `  status: ${result.status}`,
          `  createdDatetime: ${result.createdDatetime}`,
          `  comment: ${result.comment}`,
          `  description: ${result.description}`,
          `  isLocked: ${result.isLocked}`,
        ];

        const lineNodes = result.lines?.nodes ?? [];
        lines.push(`  lines: ${lineNodes.length} line(s)`);
        if (lineNodes.length > 0) {
          lines.push('');
          for (const line of lineNodes) {
            lines.push(formatRecord(line));
            lines.push('');
          }
        }

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      },
    },
  ];
}
