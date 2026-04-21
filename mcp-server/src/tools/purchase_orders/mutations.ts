import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';

export function purchaseOrderMutationTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'insert_purchase_order',
      category: 'purchase_orders',
      kind: 'mutation',
      description:
        'Create a new purchase order. Only id and supplierId are supported on insert — use update_purchase_order to set comment, reference, status etc.',
      schema: {
        id: z.string().describe('Unique ID for the new purchase order'),
        supplierId: z.string().describe('The supplier name ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation insertPurchaseOrder(
            $storeId: String!
            $input: InsertPurchaseOrderInput!
          ) {
            insertPurchaseOrder(storeId: $storeId, input: $input) {
              __typename
              ... on IdResponse {
                id
              }
            }
          }
        `;

        const input: Record<string, unknown> = {
          id: args.id as string,
          supplierId: args.supplierId as string,
        };

        const data = await client.query<{
          insertPurchaseOrder: {
            __typename: string;
            id?: string;
          };
        }>(mutation, { storeId, input });

        const result = data.insertPurchaseOrder;
        if (result.__typename !== 'IdResponse') {
          return {
            content: [
              {
                type: 'text',
                text: `Error inserting purchase order: server returned ${result.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Purchase order created:\n  id: ${result.id}`,
            },
          ],
        };
      },
    },
    {
      name: 'update_purchase_order',
      category: 'purchase_orders',
      kind: 'mutation',
      description:
        'Update an existing purchase order',
      schema: {
        id: z.string().describe('The purchase order ID to update'),
        status: z
          .enum(['REQUEST_APPROVAL', 'CONFIRMED', 'SENT', 'FINALISED'])
          .optional()
          .describe('Update status'),
        comment: z.string().optional().describe('Comment'),
        theirReference: z.string().optional().describe('Their reference'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation updatePurchaseOrder(
            $storeId: String!
            $input: UpdatePurchaseOrderInput!
          ) {
            updatePurchaseOrder(storeId: $storeId, input: $input) {
              __typename
              ... on IdResponse {
                id
              }
            }
          }
        `;

        const input: Record<string, unknown> = { id: args.id as string };
        if (args.status !== undefined) input.status = args.status as string;
        if (args.comment !== undefined) input.comment = args.comment as string;
        if (args.theirReference !== undefined) input.reference = args.theirReference as string;

        const data = await client.query<{
          updatePurchaseOrder: {
            __typename: string;
            id?: string;
          };
        }>(mutation, { storeId, input });

        const result = data.updatePurchaseOrder;
        if (result.__typename !== 'IdResponse') {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating purchase order: server returned ${result.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Purchase order updated:\n  id: ${result.id}`,
            },
          ],
        };
      },
    },
    {
      name: 'delete_purchase_order',
      category: 'purchase_orders',
      kind: 'mutation',
      description:
        'Delete a purchase order',
      schema: {
        id: z.string().describe('The purchase order ID to delete'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation deletePurchaseOrder(
            $storeId: String!
            $id: String!
          ) {
            deletePurchaseOrder(storeId: $storeId, id: $id) {
              __typename
              ... on DeleteResponse {
                id
              }
            }
          }
        `;

        const data = await client.query<{
          deletePurchaseOrder: {
            __typename: string;
            id?: string;
          };
        }>(mutation, { storeId, id: args.id as string });

        const result = data.deletePurchaseOrder;
        if (result.__typename !== 'DeleteResponse') {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting purchase order: server returned ${result.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Purchase order deleted: ${result.id}`,
            },
          ],
        };
      },
    },
  ];
}
