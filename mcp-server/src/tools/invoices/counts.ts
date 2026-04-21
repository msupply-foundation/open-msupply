import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';

export function invoiceCountTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'get_outbound_shipment_counts',
      category: 'invoices',
      kind: 'query',
      description:
        'Get counts of outbound shipments: created today, this week, and not yet shipped',
      schema: {
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);

        const query = gql`
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

        const data = await client.query<{
          outboundShipmentCounts: {
            created: { today: number; thisWeek: number };
            notShipped: number;
          };
        }>(query, { storeId });

        const counts = data.outboundShipmentCounts;
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                'Outbound Shipment Counts:',
                `  Created today: ${counts.created.today}`,
                `  Created this week: ${counts.created.thisWeek}`,
                `  Not shipped: ${counts.notShipped}`,
              ].join('\n'),
            },
          ],
        };
      },
    },
    {
      name: 'get_inbound_shipment_counts',
      category: 'invoices',
      kind: 'query',
      description:
        'Get counts of inbound shipments: created today, this week, and not yet delivered',
      schema: {
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);

        const query = gql`
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

        const data = await client.query<{
          inboundShipmentCounts: {
            created: { today: number; thisWeek: number };
            notDelivered: number;
          };
        }>(query, { storeId });

        const counts = data.inboundShipmentCounts;
        return {
          content: [
            {
              type: 'text' as const,
              text: [
                'Inbound Shipment Counts:',
                `  Created today: ${counts.created.today}`,
                `  Created this week: ${counts.created.thisWeek}`,
                `  Not delivered: ${counts.notDelivered}`,
              ].join('\n'),
            },
          ],
        };
      },
    },
  ];
}
