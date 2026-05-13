import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';

export function dashboardQueryTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'get_dashboard_summary',
      category: 'dashboard',
      kind: 'query',
      description:
        'Get a comprehensive dashboard summary including stock counts, item counts, invoice counts, and requisition counts',
      schema: {
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        // Server expects timezone offset in HOURS (Int). JS getTimezoneOffset
        // returns minutes with the opposite sign convention, so negate and / 60.
        const timezoneOffset = Math.round(-new Date().getTimezoneOffset() / 60);

        const query = gql`
          query getDashboard($storeId: String!, $tz: Int!) {
            stockCounts(storeId: $storeId, timezoneOffset: $tz) {
              expired
              expiringSoon
            }
            itemCounts(storeId: $storeId) {
              itemCounts {
                total
                noStock
                lowStock
                highStock
              }
            }
            outboundShipmentCounts(storeId: $storeId, timezoneOffset: $tz) {
              created {
                today
                thisWeek
              }
              notShipped
            }
            inboundShipmentCounts(storeId: $storeId, timezoneOffset: $tz) {
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

        const data = await client.query<{
          stockCounts: { expired: number; expiringSoon: number };
          itemCounts: {
            itemCounts: {
              total: number;
              noStock: number;
              lowStock: number;
              highStock: number;
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
        }>(query, { storeId, tz: timezoneOffset });

        const sc = data.stockCounts;
        const ic = data.itemCounts.itemCounts;
        const ob = data.outboundShipmentCounts;
        const ib = data.inboundShipmentCounts;
        const req = data.requisitionCounts;

        const lines = [
          '=== Dashboard Summary ===',
          '',
          'Stock Counts:',
          `  Expired: ${sc.expired}`,
          `  Expiring soon: ${sc.expiringSoon}`,
          '',
          'Item Counts:',
          `  Total items: ${ic.total}`,
          `  No stock: ${ic.noStock}`,
          `  Low stock: ${ic.lowStock}`,
          `  High stock (>6 months): ${ic.highStock}`,
          '',
          'Outbound Shipments:',
          `  Created today: ${ob.created.today}`,
          `  Created this week: ${ob.created.thisWeek}`,
          `  Not shipped: ${ob.notShipped}`,
          '',
          'Inbound Shipments:',
          `  Created today: ${ib.created.today}`,
          `  Created this week: ${ib.created.thisWeek}`,
          `  Not delivered: ${ib.notDelivered}`,
          '',
          'Requisitions:',
          `  Request (draft): ${req.request.draft}`,
          `  Response (new): ${req.response.new}`,
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      },
    },
  ];
}
