import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { formatRecord } from '../../types.js';

const INVOICE_RESULT_FRAGMENT = `
  ... on InvoiceNode {
    __typename
    id
    invoiceNumber
    type
    status
    otherPartyName
  }
`;

function handleMutationResult(
  result: Record<string, unknown>
): { content: Array<{ type: 'text'; text: string }>; isError?: boolean } {
  const typename = result.__typename as string;
  if (typename && typename.endsWith('Error')) {
    const error = result.error as { description: string } | undefined;
    return {
      content: [
        {
          type: 'text',
          text: `Error (${typename}): ${error?.description ?? 'Unknown error'}`,
        },
      ],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: 'text',
        text: `Success:\n${formatRecord(result)}`,
      },
    ],
  };
}

export function invoiceMutationTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'insert_outbound_shipment',
      category: 'invoices',
      kind: 'mutation',
      description: 'Create a new outbound shipment',
      schema: {
        id: z.string().describe('Unique ID for the new shipment'),
        otherPartyId: z.string().describe('The customer/recipient party ID'),
        onHold: z.boolean().optional().describe('Whether to place on hold'),
        comment: z.string().optional().describe('Comment for the shipment'),
        theirReference: z.string().optional().describe('Their reference'),
        colour: z.string().optional().describe('Colour tag'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const input: Record<string, unknown> = {
          id: args.id,
          otherPartyId: args.otherPartyId,
        };
        if (args.onHold !== undefined) input.onHold = args.onHold;
        if (args.comment !== undefined) input.comment = args.comment;
        if (args.theirReference !== undefined) input.theirReference = args.theirReference;
        if (args.colour !== undefined) input.colour = args.colour;

        const query = gql`
          mutation insertOutboundShipment(
            $storeId: String!
            $input: InsertOutboundShipmentInput!
          ) {
            insertOutboundShipment(storeId: $storeId, input: $input) {
              ${INVOICE_RESULT_FRAGMENT}
              ... on InsertOutboundShipmentError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          insertOutboundShipment: Record<string, unknown>;
        }>(query, { storeId, input });

        return handleMutationResult(data.insertOutboundShipment);
      },
    },
    {
      name: 'update_outbound_shipment',
      category: 'invoices',
      kind: 'mutation',
      description:
        'Update an existing outbound shipment (status, hold, comment, etc.)',
      schema: {
        id: z.string().describe('The shipment ID to update'),
        status: z
          .enum(['ALLOCATED', 'PICKED', 'SHIPPED'])
          .optional()
          .describe('New status for the shipment'),
        onHold: z.boolean().optional().describe('Whether to place on hold'),
        comment: z.string().optional().describe('Comment'),
        theirReference: z.string().optional().describe('Their reference'),
        colour: z.string().optional().describe('Colour tag'),
        transportReference: z.string().optional().describe('Transport reference'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const input: Record<string, unknown> = { id: args.id };
        if (args.status !== undefined) input.status = args.status;
        if (args.onHold !== undefined) input.onHold = args.onHold;
        if (args.comment !== undefined) input.comment = args.comment;
        if (args.theirReference !== undefined) input.theirReference = args.theirReference;
        if (args.colour !== undefined) input.colour = args.colour;
        if (args.transportReference !== undefined)
          input.transportReference = args.transportReference;

        const query = gql`
          mutation updateOutboundShipment(
            $storeId: String!
            $input: UpdateOutboundShipmentInput!
          ) {
            updateOutboundShipment(storeId: $storeId, input: $input) {
              ${INVOICE_RESULT_FRAGMENT}
              ... on UpdateOutboundShipmentError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          updateOutboundShipment: Record<string, unknown>;
        }>(query, { storeId, input });

        return handleMutationResult(data.updateOutboundShipment);
      },
    },
    {
      name: 'delete_outbound_shipment',
      category: 'invoices',
      kind: 'mutation',
      description: 'Delete an outbound shipment',
      schema: {
        id: z.string().describe('The shipment ID to delete'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);

        const query = gql`
          mutation deleteOutboundShipment(
            $storeId: String!
            $id: String!
          ) {
            deleteOutboundShipment(storeId: $storeId, id: $id) {
              ... on DeleteResponse {
                __typename
                id
              }
              ... on DeleteOutboundShipmentError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          deleteOutboundShipment: Record<string, unknown>;
        }>(query, { storeId, id: args.id });

        const result = data.deleteOutboundShipment;
        const typename = result.__typename as string;
        if (typename && typename.endsWith('Error')) {
          const error = result.error as { description: string } | undefined;
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Outbound shipment ${args.id} deleted successfully.`,
            },
          ],
        };
      },
    },
    {
      name: 'insert_inbound_shipment',
      category: 'invoices',
      kind: 'mutation',
      description: 'Create a new inbound shipment',
      schema: {
        id: z.string().describe('Unique ID for the new shipment'),
        otherPartyId: z.string().describe('The supplier party ID'),
        onHold: z.boolean().optional().describe('Whether to place on hold'),
        comment: z.string().optional().describe('Comment for the shipment'),
        theirReference: z.string().optional().describe('Their reference'),
        colour: z.string().optional().describe('Colour tag'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const input: Record<string, unknown> = {
          id: args.id,
          otherPartyId: args.otherPartyId,
        };
        if (args.onHold !== undefined) input.onHold = args.onHold;
        if (args.comment !== undefined) input.comment = args.comment;
        if (args.theirReference !== undefined) input.theirReference = args.theirReference;
        if (args.colour !== undefined) input.colour = args.colour;

        const query = gql`
          mutation insertInboundShipment(
            $storeId: String!
            $input: InsertInboundShipmentInput!
          ) {
            insertInboundShipment(storeId: $storeId, input: $input) {
              ${INVOICE_RESULT_FRAGMENT}
              ... on InsertInboundShipmentError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          insertInboundShipment: Record<string, unknown>;
        }>(query, { storeId, input });

        return handleMutationResult(data.insertInboundShipment);
      },
    },
    {
      name: 'update_inbound_shipment',
      category: 'invoices',
      kind: 'mutation',
      description:
        'Update an existing inbound shipment (status, hold, comment, etc.)',
      schema: {
        id: z.string().describe('The shipment ID to update'),
        status: z
          .enum(['DELIVERED', 'VERIFIED'])
          .optional()
          .describe('New status for the shipment'),
        onHold: z.boolean().optional().describe('Whether to place on hold'),
        comment: z.string().optional().describe('Comment'),
        theirReference: z.string().optional().describe('Their reference'),
        colour: z.string().optional().describe('Colour tag'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const input: Record<string, unknown> = { id: args.id };
        if (args.status !== undefined) input.status = args.status;
        if (args.onHold !== undefined) input.onHold = args.onHold;
        if (args.comment !== undefined) input.comment = args.comment;
        if (args.theirReference !== undefined) input.theirReference = args.theirReference;
        if (args.colour !== undefined) input.colour = args.colour;

        const query = gql`
          mutation updateInboundShipment(
            $storeId: String!
            $input: UpdateInboundShipmentInput!
          ) {
            updateInboundShipment(storeId: $storeId, input: $input) {
              ${INVOICE_RESULT_FRAGMENT}
              ... on UpdateInboundShipmentError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          updateInboundShipment: Record<string, unknown>;
        }>(query, { storeId, input });

        return handleMutationResult(data.updateInboundShipment);
      },
    },
    {
      name: 'delete_inbound_shipment',
      category: 'invoices',
      kind: 'mutation',
      description: 'Delete an inbound shipment',
      schema: {
        id: z.string().describe('The shipment ID to delete'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);

        const query = gql`
          mutation deleteInboundShipment(
            $storeId: String!
            $input: DeleteInboundShipmentInput!
          ) {
            deleteInboundShipment(storeId: $storeId, input: $input) {
              ... on DeleteResponse {
                __typename
                id
              }
              ... on DeleteInboundShipmentError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          deleteInboundShipment: Record<string, unknown>;
        }>(query, { storeId, input: { id: args.id } });

        const result = data.deleteInboundShipment;
        const typename = result.__typename as string;
        if (typename && typename.endsWith('Error')) {
          const error = result.error as { description: string } | undefined;
          return {
            content: [
              {
                type: 'text' as const,
                text: `Error: ${error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Inbound shipment ${args.id} deleted successfully.`,
            },
          ],
        };
      },
    },
    {
      name: 'insert_inbound_shipment_line',
      category: 'invoices',
      kind: 'mutation',
      description:
        'Add an item line to an existing inbound shipment. Once the shipment is moved to DELIVERED/VERIFIED, these lines become stock lines. Required: id, invoiceId, itemId, packSize, costPricePerPack, sellPricePerPack, numberOfPacks.',
      schema: {
        id: z.string().describe('Unique ID for the new line'),
        invoiceId: z.string().describe('The inbound shipment ID to add the line to'),
        itemId: z.string().describe('The item ID'),
        packSize: z.number().describe('Pack size'),
        costPricePerPack: z.number().describe('Cost price per pack'),
        sellPricePerPack: z.number().describe('Sell price per pack'),
        numberOfPacks: z.number().describe('Number of packs'),
        batch: z.string().optional().describe('Batch number'),
        expiryDate: z.string().optional().describe('Expiry date (YYYY-MM-DD)'),
        totalBeforeTax: z.number().optional().describe('Total before tax'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const input: Record<string, unknown> = {
          id: args.id,
          invoiceId: args.invoiceId,
          itemId: args.itemId,
          packSize: args.packSize,
          costPricePerPack: args.costPricePerPack,
          sellPricePerPack: args.sellPricePerPack,
          numberOfPacks: args.numberOfPacks,
        };
        if (args.batch !== undefined) input.batch = args.batch;
        if (args.expiryDate !== undefined) input.expiryDate = args.expiryDate;
        if (args.totalBeforeTax !== undefined) input.totalBeforeTax = args.totalBeforeTax;

        const query = gql`
          mutation insertInboundShipmentLine(
            $storeId: String!
            $input: InsertInboundShipmentLineInput!
          ) {
            insertInboundShipmentLine(storeId: $storeId, input: $input) {
              __typename
              ... on InvoiceLineNode {
                id
                itemName
                numberOfPacks
                packSize
                costPricePerPack
                sellPricePerPack
                batch
                expiryDate
              }
              ... on InsertInboundShipmentLineError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          insertInboundShipmentLine: Record<string, unknown>;
        }>(query, { storeId, input });

        return handleMutationResult(data.insertInboundShipmentLine);
      },
    },
    {
      name: 'insert_prescription',
      category: 'invoices',
      kind: 'mutation',
      description: 'Create a new prescription',
      schema: {
        id: z.string().describe('Unique ID for the new prescription'),
        patientId: z.string().describe('The patient ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);

        const query = gql`
          mutation insertPrescription(
            $storeId: String!
            $input: InsertPrescriptionInput!
          ) {
            insertPrescription(storeId: $storeId, input: $input) {
              ${INVOICE_RESULT_FRAGMENT}
            }
          }
        `;

        const data = await client.query<{
          insertPrescription: Record<string, unknown>;
        }>(query, {
          storeId,
          input: { id: args.id, patientId: args.patientId },
        });

        return handleMutationResult(data.insertPrescription);
      },
    },
  ];
}
