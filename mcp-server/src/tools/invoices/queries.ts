import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { paginationVars, formatListResult, formatRecord } from '../../types.js';

const INVOICE_TYPES = [
  'OUTBOUND_SHIPMENT',
  'INBOUND_SHIPMENT',
  'PRESCRIPTION',
  'SUPPLIER_RETURN',
  'CUSTOMER_RETURN',
] as const;

const INVOICE_STATUSES = [
  'NEW',
  'ALLOCATED',
  'PICKED',
  'SHIPPED',
  'DELIVERED',
  'VERIFIED',
] as const;

const INVOICE_DETAIL_FRAGMENT = `
  ... on InvoiceNode {
    __typename
    id
    invoiceNumber
    type
    status
    otherPartyName
    createdDatetime
    allocatedDatetime
    pickedDatetime
    shippedDatetime
    deliveredDatetime
    verifiedDatetime
    comment
    theirReference
    transportReference
    colour
    pricing {
      totalAfterTax
      taxPercentage
    }
    lines {
      totalCount
      nodes {
        id
        type
        numberOfPacks
        packSize
        costPricePerPack
        sellPricePerPack
        batch
        expiryDate
        item {
          id
          code
          name
          unitName
        }
      }
    }
    otherParty(storeId: $storeId) {
      id
      name
      code
      isCustomer
      isSupplier
    }
  }
  ... on NodeError {
    __typename
    error {
      description
    }
  }
`;

export function invoiceQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'list_invoices',
      category: 'invoices',
      kind: 'query',
      description:
        'List invoices with optional filtering by type, status, and other party name',
      schema: {
        type: z
          .enum(INVOICE_TYPES)
          .optional()
          .describe('Filter by invoice type'),
        status: z
          .enum(INVOICE_STATUSES)
          .optional()
          .describe('Filter by invoice status'),
        otherPartyName: z
          .string()
          .optional()
          .describe('Filter by other party name (partial match)'),
        sortBy: z
          .enum([
            'invoiceNumber',
            'otherPartyName',
            'status',
            'createdDatetime',
            'type',
          ])
          .optional()
          .describe('Field to sort by'),
        desc: z.boolean().optional().describe('Sort descending'),
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
        if (args.status) {
          filter.status = { equalTo: args.status };
        }
        if (args.otherPartyName) {
          filter.otherPartyName = { like: args.otherPartyName };
        }

        const sort = args.sortBy
          ? { key: args.sortBy, desc: args.desc ?? false }
          : undefined;

        const typeArg = args.type ? [args.type] : undefined;

        const query = gql`
          query listInvoices(
            $storeId: String!
            $page: PaginationInput
            $sort: [InvoiceSortInput!]
            $filter: InvoiceFilterInput
            $type: [InvoiceNodeType!]
          ) {
            invoices(
              storeId: $storeId
              page: $page
              sort: $sort
              filter: $filter
              type: $type
            ) {
              ... on InvoiceConnector {
                totalCount
                nodes {
                  id
                  invoiceNumber
                  type
                  status
                  otherPartyName
                  createdDatetime
                  allocatedDatetime
                  shippedDatetime
                  deliveredDatetime
                  comment
                  theirReference
                  colour
                  pricing {
                    totalAfterTax
                  }
                }
              }
            }
          }
        `;

        const data = await client.query<{
          invoices: {
            totalCount: number;
            nodes: Record<string, unknown>[];
          };
        }>(query, {
          storeId,
          page: paginationVars(first, offset),
          sort: sort ? [sort] : undefined,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          type: typeArg,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatListResult(
                'invoices',
                data.invoices.nodes,
                data.invoices.totalCount,
                first,
                offset
              ),
            },
          ],
        };
      },
    },
    {
      name: 'get_invoice',
      category: 'invoices',
      kind: 'query',
      description: 'Get detailed information about a specific invoice by ID, including lines',
      schema: {
        id: z.string().describe('The invoice ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const id = args.id as string;

        const query = gql`
          query getInvoice($id: String!, $storeId: String!) {
            invoice(id: $id, storeId: $storeId) {
              ${INVOICE_DETAIL_FRAGMENT}
            }
          }
        `;

        const data = await client.query<{
          invoice:
            | { __typename: 'InvoiceNode' } & Record<string, unknown>
            | { __typename: 'NodeError'; error: { description: string } };
        }>(query, { id, storeId });

        if (data.invoice.__typename === 'NodeError') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${data.invoice.error.description}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Invoice details:\n${formatRecord(data.invoice as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
    {
      name: 'get_invoice_by_number',
      category: 'invoices',
      kind: 'query',
      description:
        'Get detailed information about an invoice by its invoice number and type',
      schema: {
        invoiceNumber: z.number().describe('The invoice number'),
        type: z.enum(INVOICE_TYPES).describe('The invoice type'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const invoiceNumber = args.invoiceNumber as number;
        const type = args.type as string;

        const query = gql`
          query getInvoiceByNumber(
            $invoiceNumber: Int!
            $type: InvoiceNodeType!
            $storeId: String!
          ) {
            invoiceByNumber(
              invoiceNumber: $invoiceNumber
              type: $type
              storeId: $storeId
            ) {
              ${INVOICE_DETAIL_FRAGMENT}
            }
          }
        `;

        const data = await client.query<{
          invoiceByNumber:
            | { __typename: 'InvoiceNode' } & Record<string, unknown>
            | { __typename: 'NodeError'; error: { description: string } };
        }>(query, { invoiceNumber, type, storeId });

        if (data.invoiceByNumber.__typename === 'NodeError') {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${data.invoiceByNumber.error.description}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Invoice details:\n${formatRecord(data.invoiceByNumber as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
  ];
}
