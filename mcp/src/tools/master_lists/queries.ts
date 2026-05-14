import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult } from '../../types.js';

export function masterListQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'get_master_lists',
      category: 'master_lists',
      kind: 'query',
      description: 'List master lists with optional name search',
      schema: {
        search: z
          .string()
          .optional()
          .describe('Search master lists by name (partial match)'),
        first: z.number().optional().describe('Number of records to return'),
        offset: z.number().optional().describe('Number of records to skip'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const first = (args.first as number) ?? 25;
        const offset = (args.offset as number) ?? 0;

        const filter: Record<string, unknown> = {};
        if (args.search) {
          filter.name = { like: args.search };
        }

        const query = gql`
          query getMasterLists(
            $storeId: String!
            $page: PaginationInput
            $filter: MasterListFilterInput
            $sort: [MasterListSortInput!]
          ) {
            masterLists(
              storeId: $storeId
              page: $page
              filter: $filter
              sort: $sort
            ) {
              ... on MasterListConnector {
                totalCount
                nodes {
                  id
                  name
                  code
                  description
                  linesCount
                }
              }
            }
          }
        `;

        const data = await client.query<{
          masterLists: {
            totalCount: number;
            nodes: Record<string, unknown>[];
          };
        }>(query, {
          storeId,
          page: paginationVars(first, offset),
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatListResult(
                'master lists',
                data.masterLists.nodes,
                data.masterLists.totalCount,
                first,
                offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_master_list_lines',
      category: 'master_lists',
      kind: 'query',
      description: 'Get the item lines for a specific master list',
      schema: {
        masterListId: z.string().describe('The master list ID'),
        first: z.number().optional().describe('Number of records to return'),
        offset: z.number().optional().describe('Number of records to skip'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const masterListId = args.masterListId as string;
        const first = (args.first as number) ?? 25;
        const offset = (args.offset as number) ?? 0;

        const query = gql`
          query getMasterListLines(
            $storeId: String!
            $masterListId: String!
            $page: PaginationInput
            $filter: MasterListLineFilterInput
            $sort: [MasterListLineSortInput!]
          ) {
            masterListLines(
              storeId: $storeId
              masterListId: $masterListId
              page: $page
              filter: $filter
              sort: $sort
            ) {
              ... on MasterListLineConnector {
                totalCount
                nodes {
                  id
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
          masterListLines: {
            totalCount: number;
            nodes: Record<string, unknown>[];
          };
        }>(query, {
          storeId,
          masterListId,
          page: paginationVars(first, offset),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatListResult(
                'master list lines',
                data.masterListLines.nodes,
                data.masterListLines.totalCount,
                first,
                offset
              ),
            },
          ],
        };
      },
    },
  ];
}
