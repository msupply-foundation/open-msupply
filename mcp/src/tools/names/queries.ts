import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult } from '../../types.js';

export function nameQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'search_patients',
      category: 'names',
      kind: 'query',
      description:
        'Search patients by name/code/first name/last name (required for insert_prescription).',
      schema: {
        search: z
          .string()
          .optional()
          .describe('Search by patient name, code, first name, or last name (partial match)'),
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
        if (args.search) filter.name = { like: args.search as string };

        const query = gql`
          query searchPatients(
            $storeId: String!
            $page: PaginationInput
            $filter: PatientFilterInput
          ) {
            patients(storeId: $storeId, page: $page, filter: $filter) {
              ... on PatientConnector {
                totalCount
                nodes {
                  id
                  name
                  code
                  firstName
                  lastName
                  gender
                  dateOfBirth
                }
              }
            }
          }
        `;

        const data = await client.query<{
          patients: {
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
                'patients',
                data.patients.nodes,
                data.patients.totalCount,
                first,
                offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'search_names',
      category: 'names',
      kind: 'query',
      description:
        'Search for names (customers, suppliers, patients) by name with optional filters',
      schema: {
        search: z.string().describe('Name to search for (partial match)'),
        isSupplier: z
          .boolean()
          .optional()
          .describe('Filter to suppliers only'),
        isCustomer: z
          .boolean()
          .optional()
          .describe('Filter to customers only'),
        isStore: z
          .boolean()
          .optional()
          .describe(
            'Filter to names that represent an mSupply store (required when picking a counter-party for request requisitions)'
          ),
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

        const filter: Record<string, unknown> = {
          name: { like: args.search },
        };
        if (args.isSupplier !== undefined) {
          filter.isSupplier = args.isSupplier;
        }
        if (args.isCustomer !== undefined) {
          filter.isCustomer = args.isCustomer;
        }
        if (args.isStore !== undefined) {
          filter.isStore = args.isStore;
        }

        const query = gql`
          query searchNames(
            $storeId: String!
            $page: PaginationInput
            $filter: NameFilterInput
            $sort: [NameSortInput!]
          ) {
            names(
              storeId: $storeId
              page: $page
              filter: $filter
              sort: $sort
            ) {
              ... on NameConnector {
                totalCount
                nodes {
                  id
                  name
                  code
                  isCustomer
                  isSupplier
                  isOnHold
                  phone
                  address1
                  address2
                  country
                }
              }
            }
          }
        `;

        const data = await client.query<{
          names: {
            totalCount: number;
            nodes: Record<string, unknown>[];
          };
        }>(query, {
          storeId,
          page: paginationVars(first, offset),
          filter,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatListResult(
                'names',
                data.names.nodes,
                data.names.totalCount,
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
