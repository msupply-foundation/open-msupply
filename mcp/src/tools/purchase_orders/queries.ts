import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult, formatRecord } from '../../types.js';

export function purchaseOrderQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_purchase_orders',
      category: 'purchase_orders',
      kind: 'query',
      description:
        'List purchase orders with optional filtering by status or supplier. Returns a paginated list.',
      schema: {
        status: z
          .enum(['NEW', 'REQUEST_APPROVAL', 'CONFIRMED', 'SENT', 'FINALISED'])
          .optional()
          .describe('Filter by purchase order status'),
        search: z
          .string()
          .optional()
          .describe('Search by supplier name (partial, case-insensitive match)'),
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
        if (args.search) filter.supplier = { like: args.search as string };

        const query = gql`
          query listPurchaseOrders(
            $storeId: String!
            $first: Int
            $offset: Int
            $filter: PurchaseOrderFilterInput
          ) {
            purchaseOrders(
              storeId: $storeId
              page: { first: $first, offset: $offset }
              filter: $filter
            ) {
              ... on PurchaseOrderConnector {
                totalCount
                nodes {
                  id
                  number
                  status
                  createdDatetime
                  comment
                  reference
                  supplier {
                    id
                    name
                    code
                  }
                }
              }
            }
          }
        `;
        const data = await client.query<{
          purchaseOrders: {
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
                'purchase orders',
                data.purchaseOrders.nodes,
                data.purchaseOrders.totalCount,
                page.first,
                page.offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_purchase_order',
      category: 'purchase_orders',
      kind: 'query',
      description:
        'Get detailed information about a purchase order including its lines',
      schema: {
        id: z.string().describe('The purchase order ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const query = gql`
          query getPurchaseOrder($storeId: String!, $id: String!) {
            purchaseOrder(storeId: $storeId, id: $id) {
              __typename
              ... on PurchaseOrderNode {
                id
                number
                status
                createdDatetime
                confirmedDatetime
                sentDatetime
                comment
                reference
                supplier {
                  id
                  name
                  code
                }
                orderTotalAfterDiscount
                lines {
                  nodes {
                    id
                    lineNumber
                    requestedPackSize
                    requestedNumberOfUnits
                    receivedNumberOfUnits
                    pricePerPackAfterDiscount
                    item {
                      id
                      code
                      name
                    }
                  }
                }
              }
              ... on RecordNotFound {
                __typename
                description
              }
            }
          }
        `;
        const data = await client.query<{
          purchaseOrder: {
            __typename: string;
            id?: string;
            number?: number;
            status?: string;
            createdDatetime?: string;
            confirmedDatetime?: string | null;
            sentDatetime?: string | null;
            comment?: string | null;
            reference?: string | null;
            supplier?: { id: string; name: string; code: string } | null;
            orderTotalAfterDiscount?: number;
            lines?: { nodes: Array<Record<string, unknown>> };
            description?: string;
          };
        }>(query, { storeId, id: args.id as string });

        const result = data.purchaseOrder;
        if (result.__typename === 'RecordNotFound') {
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching purchase order: ${result.description ?? 'Record not found'}`,
              },
            ],
            isError: true,
          };
        }

        const lines = [
          'Purchase order details:',
          `  id: ${result.id}`,
          `  number: ${result.number}`,
          `  status: ${result.status}`,
          `  supplier: ${result.supplier ? `${result.supplier.name} (${result.supplier.code})` : '(none)'}`,
          `  createdDatetime: ${result.createdDatetime}`,
          `  confirmedDatetime: ${result.confirmedDatetime ?? '-'}`,
          `  sentDatetime: ${result.sentDatetime ?? '-'}`,
          `  comment: ${result.comment ?? ''}`,
          `  reference: ${result.reference ?? ''}`,
          `  orderTotalAfterDiscount: ${result.orderTotalAfterDiscount}`,
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
