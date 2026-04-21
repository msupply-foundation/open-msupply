import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult, formatRecord } from '../../types.js';

export function requisitionQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_requisitions',
      category: 'requisitions',
      kind: 'query',
      description:
        'List requisitions with optional filtering by type, status, or other party name. Returns a paginated list.',
      schema: {
        type: z
          .enum(['REQUEST', 'RESPONSE'])
          .optional()
          .describe('Filter by requisition type'),
        status: z
          .enum(['DRAFT', 'NEW', 'SENT', 'FINALISED'])
          .optional()
          .describe('Filter by requisition status'),
        search: z
          .string()
          .optional()
          .describe('Search by other party (customer/supplier) name (partial, case-insensitive)'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
        first: z.number().optional().describe('Number of results to return (default 25)'),
        offset: z.number().optional().describe('Offset for pagination (default 0)'),
        sortBy: z
          .enum(['requisitionNumber', 'otherPartyName', 'status', 'createdDatetime', 'type'])
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

        const filter: Record<string, unknown> = {};
        if (args.type) filter.type = { equalTo: args.type as string };
        if (args.status) filter.status = { equalTo: args.status as string };
        if (args.search) filter.otherPartyName = { like: args.search as string };

        const query = gql`
          query listRequisitions(
            $storeId: String!
            $first: Int
            $offset: Int
            $sort: [RequisitionSortInput!]
            $filter: RequisitionFilterInput
          ) {
            requisitions(
              storeId: $storeId
              page: { first: $first, offset: $offset }
              sort: $sort
              filter: $filter
            ) {
              ... on RequisitionConnector {
                totalCount
                nodes {
                  id
                  requisitionNumber
                  type
                  status
                  otherPartyName
                  createdDatetime
                  comment
                  theirReference
                  colour
                }
              }
            }
          }
        `;
        const data = await client.query<{
          requisitions: {
            totalCount: number;
            nodes: Array<Record<string, unknown>>;
          };
        }>(query, {
          storeId,
          first: page.first,
          offset: page.offset,
          sort: sort ? [sort] : undefined,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
        });
        return {
          content: [
            {
              type: 'text',
              text: formatListResult(
                'requisitions',
                data.requisitions.nodes,
                data.requisitions.totalCount,
                page.first,
                page.offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_requisition',
      category: 'requisitions',
      kind: 'query',
      description:
        'Get detailed information about a requisition including its lines',
      schema: {
        id: z.string().describe('The requisition ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const query = gql`
          query getRequisition($storeId: String!, $id: String!) {
            requisition(storeId: $storeId, id: $id) {
              __typename
              ... on RequisitionNode {
                id
                requisitionNumber
                type
                status
                otherPartyName
                createdDatetime
                comment
                theirReference
                colour
                lines {
                  nodes {
                    id
                    itemId
                    requestedQuantity
                    supplyQuantity
                    item {
                      id
                      code
                      name
                      unitName
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
          requisition: {
            __typename: string;
            id?: string;
            requisitionNumber?: number;
            type?: string;
            status?: string;
            otherPartyName?: string;
            createdDatetime?: string;
            comment?: string;
            theirReference?: string;
            colour?: string;
            lines?: { nodes: Array<Record<string, unknown>> };
            description?: string;
          };
        }>(query, { storeId, id: args.id as string });

        const result = data.requisition;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching requisition: ${result.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        const lines = [
          'Requisition details:',
          `  id: ${result.id}`,
          `  requisitionNumber: ${result.requisitionNumber}`,
          `  type: ${result.type}`,
          `  status: ${result.status}`,
          `  otherPartyName: ${result.otherPartyName}`,
          `  createdDatetime: ${result.createdDatetime}`,
          `  comment: ${result.comment}`,
          `  theirReference: ${result.theirReference}`,
          `  colour: ${result.colour}`,
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
    {
      name: 'get_requisition_by_number',
      category: 'requisitions',
      kind: 'query',
      description:
        'Get a requisition by its requisition number and type',
      schema: {
        requisitionNumber: z.number().describe('The requisition number'),
        type: z.enum(['REQUEST', 'RESPONSE']).describe('The requisition type'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const query = gql`
          query getRequisitionByNumber(
            $storeId: String!
            $requisitionNumber: Int!
            $type: RequisitionNodeType!
          ) {
            requisitionByNumber(
              storeId: $storeId
              requisitionNumber: $requisitionNumber
              type: $type
            ) {
              __typename
              ... on RequisitionNode {
                id
                requisitionNumber
                type
                status
                otherPartyName
                createdDatetime
                comment
                theirReference
                colour
                lines {
                  nodes {
                    id
                    itemId
                    requestedQuantity
                    supplyQuantity
                    item {
                      id
                      code
                      name
                      unitName
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
          requisitionByNumber: {
            __typename: string;
            id?: string;
            requisitionNumber?: number;
            type?: string;
            status?: string;
            otherPartyName?: string;
            createdDatetime?: string;
            comment?: string;
            theirReference?: string;
            colour?: string;
            lines?: { nodes: Array<Record<string, unknown>> };
            description?: string;
          };
        }>(query, {
          storeId,
          requisitionNumber: args.requisitionNumber as number,
          type: args.type as string,
        });

        const result = data.requisitionByNumber;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error fetching requisition: ${result.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        const lines = [
          'Requisition details:',
          `  id: ${result.id}`,
          `  requisitionNumber: ${result.requisitionNumber}`,
          `  type: ${result.type}`,
          `  status: ${result.status}`,
          `  otherPartyName: ${result.otherPartyName}`,
          `  createdDatetime: ${result.createdDatetime}`,
          `  comment: ${result.comment}`,
          `  theirReference: ${result.theirReference}`,
          `  colour: ${result.colour}`,
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
    {
      name: 'get_requisition_counts',
      category: 'requisitions',
      kind: 'query',
      description:
        'Get requisition count summaries grouped by type and status',
      schema: {
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const query = gql`
          query getRequisitionCounts($storeId: String!) {
            requisitionCounts(storeId: $storeId) {
              request {
                draft
              }
              response {
                new
              }
              emergency {
                new
              }
            }
          }
        `;
        const data = await client.query<{
          requisitionCounts: {
            request: { draft: number };
            response: { new: number };
            emergency: { new: number };
          };
        }>(query, { storeId });

        const rc = data.requisitionCounts;
        const lines = [
          'Requisition Counts:',
          '',
          'Request requisitions:',
          `  Draft: ${rc.request.draft}`,
          '',
          'Response requisitions:',
          `  New: ${rc.response.new}`,
          '',
          'Emergency response requisitions:',
          `  New: ${rc.emergency.new}`,
        ];
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      },
    },
  ];
}
