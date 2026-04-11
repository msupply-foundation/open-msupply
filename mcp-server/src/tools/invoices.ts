import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { OmSupplyClient } from '../client.js';
import { paginationVars, formatListResult, formatRecord } from '../types.js';

const INVOICES_QUERY = gql`
  query invoices(
    $first: Int
    $offset: Int
    $key: InvoiceSortFieldInput!
    $desc: Boolean
    $filter: InvoiceFilterInput
    $storeId: String!
    $type: [InvoiceTypeInput!]
  ) {
    invoices(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
      storeId: $storeId
      type: $type
    ) {
      ... on InvoiceConnector {
        __typename
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

const INVOICE_DETAIL_QUERY = gql`
  query invoice($id: String!, $storeId: String!) {
    invoice(id: $id, storeId: $storeId) {
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
        taxPercentage
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
    }
  }
`;

const OUTBOUND_COUNTS_QUERY = gql`
  query outboundShipmentCounts($storeId: String!) {
    outboundShipmentCounts(storeId: $storeId) {
      created {
        today
        thisWeek
      }
      notShipped
    }
  }
`;

const INBOUND_COUNTS_QUERY = gql`
  query inboundShipmentCounts($storeId: String!) {
    inboundShipmentCounts(storeId: $storeId) {
      created {
        today
        thisWeek
      }
      notDelivered
    }
  }
`;

interface InvoicesResponse {
  invoices: {
    __typename: string;
    totalCount: number;
    nodes: Array<Record<string, unknown>>;
  };
}

interface InvoiceDetailResponse {
  invoice:
    | ({ __typename: 'InvoiceNode' } & Record<string, unknown>)
    | { __typename: 'NodeError'; error: { description: string } };
}

interface OutboundCountsResponse {
  outboundShipmentCounts: {
    created: { today: number; thisWeek: number };
    notShipped: number;
  };
}

interface InboundCountsResponse {
  inboundShipmentCounts: {
    created: { today: number; thisWeek: number };
    notDelivered: number;
  };
}

export function registerInvoiceTools(
  server: McpServer,
  client: OmSupplyClient
) {
  server.tool(
    'list_invoices',
    'List invoices (shipments) with optional filters. Covers outbound shipments, inbound shipments, prescriptions, and returns.',
    {
      type: z
        .enum([
          'OUTBOUND_SHIPMENT',
          'INBOUND_SHIPMENT',
          'PRESCRIPTION',
          'SUPPLIER_RETURN',
          'CUSTOMER_RETURN',
        ])
        .optional()
        .describe('Filter by invoice type'),
      status: z
        .enum([
          'NEW',
          'ALLOCATED',
          'PICKED',
          'SHIPPED',
          'DELIVERED',
          'VERIFIED',
        ])
        .optional()
        .describe('Filter by invoice status'),
      otherPartyName: z
        .string()
        .optional()
        .describe('Filter by other party (supplier/customer) name'),
      sortBy: z
        .enum([
          'invoiceNumber',
          'otherPartyName',
          'status',
          'createdDatetime',
          'type',
        ])
        .optional()
        .describe('Sort field (default: createdDatetime)'),
      desc: z.boolean().optional().describe('Sort descending (default true)'),
      first: z.number().optional().describe('Max results (default 25)'),
      offset: z.number().optional().describe('Pagination offset'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({
      type,
      status,
      otherPartyName,
      sortBy,
      desc,
      first,
      offset,
      storeId,
    }) => {
      const resolvedStoreId = client.requireStoreId(storeId);
      const pagination = paginationVars(first, offset);

      const filter: Record<string, unknown> = {};
      if (status) filter.status = { equalTo: status };
      if (otherPartyName)
        filter.otherPartyName = { like: otherPartyName };

      const typeArg = type ? [type] : undefined;

      const data = await client.query<InvoicesResponse>(INVOICES_QUERY, {
        ...pagination,
        key: sortBy ?? 'createdDatetime',
        desc: desc ?? true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        storeId: resolvedStoreId,
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
              pagination.first,
              pagination.offset
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'get_invoice',
    'Get detailed information about a specific invoice including all line items, pricing, and party details.',
    {
      id: z.string().describe('The invoice ID'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ id, storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);

      const data = await client.query<InvoiceDetailResponse>(
        INVOICE_DETAIL_QUERY,
        {
          id,
          storeId: resolvedStoreId,
        }
      );

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
            text: `Invoice details:\n${formatRecord(data.invoice)}`,
          },
        ],
      };
    }
  );

  server.tool(
    'get_outbound_shipment_counts',
    'Get counts of outbound shipments - how many created today/this week, and how many are not yet shipped.',
    {
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);

      const data = await client.query<OutboundCountsResponse>(
        OUTBOUND_COUNTS_QUERY,
        { storeId: resolvedStoreId }
      );

      const counts = data.outboundShipmentCounts;

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              'Outbound Shipment Counts:',
              `  Created today: ${counts.created.today}`,
              `  Created this week: ${counts.created.thisWeek}`,
              `  Not yet shipped: ${counts.notShipped}`,
            ].join('\n'),
          },
        ],
      };
    }
  );

  server.tool(
    'get_inbound_shipment_counts',
    'Get counts of inbound shipments - how many created today/this week, and how many are not yet delivered.',
    {
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);

      const data = await client.query<InboundCountsResponse>(
        INBOUND_COUNTS_QUERY,
        { storeId: resolvedStoreId }
      );

      const counts = data.inboundShipmentCounts;

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              'Inbound Shipment Counts:',
              `  Created today: ${counts.created.today}`,
              `  Created this week: ${counts.created.thisWeek}`,
              `  Not yet delivered: ${counts.notDelivered}`,
            ].join('\n'),
          },
        ],
      };
    }
  );
}
