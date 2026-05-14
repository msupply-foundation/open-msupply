import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult } from '../../types.js';

export function locationQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_locations',
      category: 'locations',
      kind: 'query',
      description:
        'List locations in a store. Returns a paginated list of storage locations, optionally filtered by name or code.',
      schema: {
        search: z
          .string()
          .optional()
          .describe('Search by location name (partial, case-insensitive match)'),
        code: z
          .string()
          .optional()
          .describe('Filter by location code (partial, case-insensitive match)'),
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
        if (args.search) filter.name = { like: args.search as string };
        if (args.code) filter.code = { like: args.code as string };

        const query = gql`
          query listLocations(
            $storeId: String!
            $first: Int
            $offset: Int
            $filter: LocationFilterInput
          ) {
            locations(
              storeId: $storeId
              page: { first: $first, offset: $offset }
              filter: $filter
            ) {
              ... on LocationConnector {
                totalCount
                nodes {
                  id
                  name
                  code
                  onHold
                }
              }
            }
          }
        `;
        const data = await client.query<{
          locations: {
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
                'locations',
                data.locations.nodes,
                data.locations.totalCount,
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
