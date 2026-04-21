import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult } from '../../types.js';

export function systemQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_stores',
      category: 'system',
      kind: 'query',
      description:
        'List all stores on the server (including ones the current user cannot access). To find stores you can actually query against, use list_my_stores. Supports pagination and optional search by store code or name.',
      schema: {
        search: z
          .string()
          .optional()
          .describe('Search by store code or name (partial, case-insensitive match)'),
        first: z.number().optional().describe('Number of records to return (default 25)'),
        offset: z.number().optional().describe('Number of records to skip (default 0)'),
      },
      handler: async (args) => {
        const first = (args.first as number) ?? 25;
        const offset = (args.offset as number) ?? 0;
        const filter = args.search
          ? { codeOrName: { like: args.search as string } }
          : undefined;

        const query = gql`
          query listStores(
            $page: PaginationInput
            $filter: StoreFilterInput
            $sort: [StoreSortInput!]
          ) {
            stores(page: $page, filter: $filter, sort: $sort) {
              ... on StoreConnector {
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
        const data = await client.query<{
          stores: {
            totalCount: number;
            nodes: Array<{ id: string; code: string; storeName: string }>;
          };
        }>(query, {
          page: paginationVars(first, offset),
          filter,
          sort: [{ key: 'name', desc: false }],
        });
        return {
          content: [
            {
              type: 'text' as const,
              text: formatListResult(
                'stores',
                data.stores.nodes,
                data.stores.totalCount,
                first,
                offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_store',
      category: 'system',
      kind: 'query',
      description: 'Get details of a specific store by ID',
      schema: {
        id: z.string().describe('The store ID to look up'),
      },
      handler: async (args) => {
        const id = args.id as string;
        const query = gql`
          query getStore($filter: StoreFilterInput) {
            stores(filter: $filter) {
              ... on StoreConnector {
                nodes {
                  id
                  code
                  storeName
                  siteId
                  createdDate
                }
              }
            }
          }
        `;
        const data = await client.query<{
          stores: {
            nodes: Array<{
              id: string;
              code: string;
              storeName: string;
              siteId: number;
              createdDate: string | null;
            }>;
          };
        }>(query, { filter: { id: { equalTo: id } } });
        const nodes = data.stores.nodes;
        if (nodes.length === 0) {
          return {
            content: [{ type: 'text', text: `No store found with ID: ${id}` }],
            isError: true,
          };
        }
        const s = nodes[0];
        return {
          content: [
            {
              type: 'text',
              text: `Store details:\n  id: ${s.id}\n  code: ${s.code}\n  storeName: ${s.storeName}\n  siteId: ${s.siteId}\n  createdDate: ${s.createdDate ?? ''}`,
            },
          ],
        };
      },
    },
    {
      name: 'list_my_stores',
      category: 'system',
      kind: 'query',
      description:
        'List stores the currently authenticated user has access to. Use this to find a valid storeId to pass to set_active_store — most other queries will return Forbidden for stores the user is not assigned to.',
      schema: {},
      handler: async () => {
        const query = gql`
          query listMyStores {
            me {
              ... on UserNode {
                username
                defaultStore {
                  id
                  code
                  name
                }
                stores {
                  totalCount
                  nodes {
                    id
                    code
                    name
                    isDisabled
                  }
                }
              }
            }
          }
        `;
        const data = await client.query<{
          me: {
            username: string;
            defaultStore: { id: string; code: string; name: string } | null;
            stores: {
              totalCount: number;
              nodes: Array<{
                id: string;
                code: string;
                name: string;
                isDisabled: boolean;
              }>;
            };
          };
        }>(query);

        const me = data.me;
        const defaultId = me.defaultStore?.id;
        const lines = [
          `Authenticated as: ${me.username}`,
          me.defaultStore
            ? `Default store: ${me.defaultStore.code} — ${me.defaultStore.name} (id: ${me.defaultStore.id})`
            : 'Default store: (none)',
          '',
          `Accessible stores (${me.stores.totalCount}):`,
        ];
        if (me.stores.nodes.length === 0) {
          lines.push('  (none — user is not assigned to any stores)');
        } else {
          for (const s of me.stores.nodes) {
            const tags: string[] = [];
            if (s.id === defaultId) tags.push('default');
            if (s.isDisabled) tags.push('disabled');
            const suffix = tags.length ? ` [${tags.join(', ')}]` : '';
            lines.push(`  id: ${s.id}`);
            lines.push(`  code: ${s.code}`);
            lines.push(`  name: ${s.name}${suffix}`);
            lines.push('');
          }
        }
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      },
    },
    {
      name: 'get_server_info',
      category: 'system',
      kind: 'query',
      description: 'Get server version and API information',
      schema: {},
      handler: async () => {
        const query = gql`
          query {
            apiVersion
          }
        `;
        const data = await client.query<{ apiVersion: string }>(query);
        return {
          content: [
            {
              type: 'text',
              text: `Open mSupply server API version: ${data.apiVersion}`,
            },
          ],
        };
      },
    },
    {
      name: 'set_active_store',
      category: 'system',
      kind: 'query',
      description:
        'Set the active store ID for subsequent queries. Use list_my_stores to find a store ID the authenticated user can access (list_stores returns all stores on the server, including ones that will fail with Forbidden).',
      schema: {
        storeId: z.string().describe('The store ID to set as active'),
      },
      handler: async (args) => {
        const storeId = args.storeId as string;
        client.setStoreId(storeId);
        return {
          content: [
            {
              type: 'text',
              text: `Active store set to: ${storeId}`,
            },
          ],
        };
      },
    },
  ];
}
