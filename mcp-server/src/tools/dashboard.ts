import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { OmSupplyClient } from '../client.js';
import { paginationVars, formatListResult } from '../types.js';

const DASHBOARD_QUERY = gql`
  query dashboard($storeId: String!) {
    stockCounts(storeId: $storeId, daysTillExpired: 30) {
      expired
      expiringSoon
    }
    itemCounts(
      storeId: $storeId
      lowStockThreshold: 3
      highStockThreshold: 6
    ) {
      itemCounts {
        lowStock
        noStock
        highStock
        total
      }
    }
    outboundShipmentCounts(storeId: $storeId) {
      created {
        today
        thisWeek
      }
      notShipped
    }
    inboundShipmentCounts(storeId: $storeId) {
      created {
        today
        thisWeek
      }
      notDelivered
    }
    requisitionCounts(storeId: $storeId) {
      request {
        draft
      }
      response {
        new
      }
    }
  }
`;

const REQUISITION_COUNTS_QUERY = gql`
  query requisitionCounts($storeId: String!) {
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

const NAMES_QUERY = gql`
  query names(
    $storeId: String!
    $key: NameSortFieldInput!
    $desc: Boolean
    $first: Int
    $offset: Int
    $filter: NameFilterInput
  ) {
    names(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: $filter
    ) {
      ... on NameConnector {
        __typename
        totalCount
        nodes {
          id
          code
          name
          isCustomer
          isSupplier
          isOnHold
          store {
            id
            code
          }
        }
      }
    }
  }
`;

const MASTER_LISTS_QUERY = gql`
  query masterLists(
    $storeId: String!
    $first: Int
    $offset: Int
    $filter: MasterListFilterInput
    $sort: [MasterListSortInput!]
  ) {
    masterLists(
      storeId: $storeId
      page: { first: $first, offset: $offset }
      filter: $filter
      sort: $sort
    ) {
      ... on MasterListConnector {
        __typename
        totalCount
        nodes {
          id
          code
          name
          description
          linesCount
        }
      }
    }
  }
`;

interface DashboardResponse {
  stockCounts: {
    expired: number;
    expiringSoon: number;
  };
  itemCounts: {
    itemCounts: {
      lowStock: number;
      noStock: number;
      highStock: number;
      total: number;
    };
  };
  outboundShipmentCounts: {
    created: { today: number; thisWeek: number };
    notShipped: number;
  };
  inboundShipmentCounts: {
    created: { today: number; thisWeek: number };
    notDelivered: number;
  };
  requisitionCounts: {
    request: { draft: number };
    response: { new: number };
  };
}

interface RequisitionCountsResponse {
  requisitionCounts: {
    request: { draft: number };
    response: { new: number };
    emergency: { new: number };
  };
}

interface NamesResponse {
  names: {
    __typename: string;
    totalCount: number;
    nodes: Array<Record<string, unknown>>;
  };
}

interface MasterListsResponse {
  masterLists: {
    __typename: string;
    totalCount: number;
    nodes: Array<Record<string, unknown>>;
  };
}

export function registerDashboardTools(
  server: McpServer,
  client: OmSupplyClient
) {
  server.tool(
    'get_dashboard_summary',
    'Get a comprehensive dashboard summary of the store including stock health, shipment activity, and pending requisitions. Great for a quick overview.',
    {
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);

      const data = await client.query<DashboardResponse>(DASHBOARD_QUERY, {
        storeId: resolvedStoreId,
      });

      const items = data.itemCounts.itemCounts;
      const stock = data.stockCounts;
      const outbound = data.outboundShipmentCounts;
      const inbound = data.inboundShipmentCounts;
      const reqs = data.requisitionCounts;

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              '=== Open mSupply Dashboard ===',
              '',
              'INVENTORY:',
              `  Total items: ${items.total}`,
              `  No stock: ${items.noStock}`,
              `  Low stock (<3 months): ${items.lowStock}`,
              `  Overstocked (>6 months): ${items.highStock}`,
              `  Expired batches: ${stock.expired}`,
              `  Expiring within 30 days: ${stock.expiringSoon}`,
              '',
              'OUTBOUND SHIPMENTS:',
              `  Created today: ${outbound.created.today}`,
              `  Created this week: ${outbound.created.thisWeek}`,
              `  Awaiting shipment: ${outbound.notShipped}`,
              '',
              'INBOUND SHIPMENTS:',
              `  Created today: ${inbound.created.today}`,
              `  Created this week: ${inbound.created.thisWeek}`,
              `  Awaiting delivery: ${inbound.notDelivered}`,
              '',
              'REQUISITIONS:',
              `  Draft requests: ${reqs.request.draft}`,
              `  New responses to process: ${reqs.response.new}`,
            ].join('\n'),
          },
        ],
      };
    }
  );

  server.tool(
    'get_requisition_counts',
    'Get counts of requisitions by status - draft requests, new responses, and emergency requisitions.',
    {
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);

      const data = await client.query<RequisitionCountsResponse>(
        REQUISITION_COUNTS_QUERY,
        { storeId: resolvedStoreId }
      );

      const counts = data.requisitionCounts;

      return {
        content: [
          {
            type: 'text' as const,
            text: [
              'Requisition Counts:',
              `  Draft requests: ${counts.request.draft}`,
              `  New responses: ${counts.response.new}`,
              `  Emergency (new): ${counts.emergency.new}`,
            ].join('\n'),
          },
        ],
      };
    }
  );

  server.tool(
    'search_names',
    'Search for suppliers, customers, and facilities by name or code.',
    {
      search: z
        .string()
        .optional()
        .describe('Search term to match against name'),
      code: z.string().optional().describe('Filter by exact code'),
      isSupplier: z.boolean().optional().describe('Filter to only suppliers'),
      isCustomer: z.boolean().optional().describe('Filter to only customers'),
      first: z.number().optional().describe('Max results (default 25)'),
      offset: z.number().optional().describe('Pagination offset'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ search, code, isSupplier, isCustomer, first, offset, storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);
      const pagination = paginationVars(first, offset);

      const filter: Record<string, unknown> = {};
      if (search) filter.name = { like: search };
      if (code) filter.code = { equalTo: code };
      if (isSupplier !== undefined) filter.isSupplier = isSupplier;
      if (isCustomer !== undefined) filter.isCustomer = isCustomer;

      const data = await client.query<NamesResponse>(NAMES_QUERY, {
        ...pagination,
        key: 'name',
        desc: false,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        storeId: resolvedStoreId,
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatListResult(
              'names',
              data.names.nodes,
              data.names.totalCount,
              pagination.first,
              pagination.offset
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'get_master_lists',
    'Get master lists (item catalogs) available for the store.',
    {
      search: z
        .string()
        .optional()
        .describe('Search term to match against master list name'),
      first: z.number().optional().describe('Max results (default 25)'),
      offset: z.number().optional().describe('Pagination offset'),
      storeId: z
        .string()
        .optional()
        .describe('Store ID (uses default if not provided)'),
    },
    async ({ search, first, offset, storeId }) => {
      const resolvedStoreId = client.requireStoreId(storeId);
      const pagination = paginationVars(first, offset);

      const filter: Record<string, unknown> = {};
      if (search) filter.name = { like: search };

      const data = await client.query<MasterListsResponse>(
        MASTER_LISTS_QUERY,
        {
          ...pagination,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          storeId: resolvedStoreId,
        }
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: formatListResult(
              'master lists',
              data.masterLists.nodes,
              data.masterLists.totalCount,
              pagination.first,
              pagination.offset
            ),
          },
        ],
      };
    }
  );
}
