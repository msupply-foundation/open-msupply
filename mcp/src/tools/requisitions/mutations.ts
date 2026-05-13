import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { formatRecord } from '../../types.js';

export function requisitionMutationTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'insert_request_requisition',
      category: 'requisitions',
      kind: 'mutation',
      description:
        'Create a new request requisition (internal order)',
      schema: {
        id: z.string().describe('Unique ID for the new requisition'),
        otherPartyId: z.string().describe('The supplier name ID'),
        colour: z.string().optional().describe('Colour label'),
        theirReference: z.string().optional().describe('Their reference'),
        comment: z.string().optional().describe('Comment'),
        maxMonthsOfStock: z.number().describe('Maximum months of stock'),
        minMonthsOfStock: z.number().describe('Minimum months of stock'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation insertRequestRequisition(
            $storeId: String!
            $input: InsertRequestRequisitionInput!
          ) {
            insertRequestRequisition(storeId: $storeId, input: $input) {
              __typename
              ... on RequisitionNode {
                id
                requisitionNumber
                type
                status
              }
              ... on InsertRequestRequisitionError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const input: Record<string, unknown> = {
          id: args.id as string,
          otherPartyId: args.otherPartyId as string,
          maxMonthsOfStock: args.maxMonthsOfStock as number,
          minMonthsOfStock: args.minMonthsOfStock as number,
        };
        if (args.colour !== undefined) input.colour = args.colour as string;
        if (args.theirReference !== undefined) input.theirReference = args.theirReference as string;
        if (args.comment !== undefined) input.comment = args.comment as string;

        const data = await client.query<{
          insertRequestRequisition: {
            __typename: string;
            id?: string;
            requisitionNumber?: number;
            type?: string;
            status?: string;
            error?: { description: string };
          };
        }>(mutation, { storeId, input });

        const result = data.insertRequestRequisition;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error inserting requisition: ${result.error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Request requisition created:\n${formatRecord(result as unknown as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
    {
      name: 'update_request_requisition',
      category: 'requisitions',
      kind: 'mutation',
      description:
        'Update an existing request requisition',
      schema: {
        id: z.string().describe('The requisition ID to update'),
        status: z
          .enum(['SENT'])
          .optional()
          .describe('Update status (can only be set to SENT)'),
        colour: z.string().optional().describe('Colour label'),
        theirReference: z.string().optional().describe('Their reference'),
        comment: z.string().optional().describe('Comment'),
        maxMonthsOfStock: z.number().optional().describe('Maximum months of stock'),
        minMonthsOfStock: z.number().optional().describe('Minimum months of stock'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation updateRequestRequisition(
            $storeId: String!
            $input: UpdateRequestRequisitionInput!
          ) {
            updateRequestRequisition(storeId: $storeId, input: $input) {
              __typename
              ... on RequisitionNode {
                id
                requisitionNumber
                type
                status
              }
              ... on UpdateRequestRequisitionError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const input: Record<string, unknown> = { id: args.id as string };
        if (args.status !== undefined) input.status = args.status as string;
        if (args.colour !== undefined) input.colour = args.colour as string;
        if (args.theirReference !== undefined) input.theirReference = args.theirReference as string;
        if (args.comment !== undefined) input.comment = args.comment as string;
        if (args.maxMonthsOfStock !== undefined) input.maxMonthsOfStock = args.maxMonthsOfStock as number;
        if (args.minMonthsOfStock !== undefined) input.minMonthsOfStock = args.minMonthsOfStock as number;

        const data = await client.query<{
          updateRequestRequisition: {
            __typename: string;
            id?: string;
            requisitionNumber?: number;
            type?: string;
            status?: string;
            error?: { description: string };
          };
        }>(mutation, { storeId, input });

        const result = data.updateRequestRequisition;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating requisition: ${result.error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Request requisition updated:\n${formatRecord(result as unknown as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
    {
      name: 'delete_request_requisition',
      category: 'requisitions',
      kind: 'mutation',
      description:
        'Delete a request requisition',
      schema: {
        id: z.string().describe('The requisition ID to delete'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation deleteRequestRequisition(
            $storeId: String!
            $input: DeleteRequestRequisitionInput!
          ) {
            deleteRequestRequisition(storeId: $storeId, input: $input) {
              __typename
              ... on DeleteResponse {
                id
              }
              ... on DeleteRequestRequisitionError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          deleteRequestRequisition: {
            __typename: string;
            id?: string;
            error?: { description: string };
          };
        }>(mutation, { storeId, input: { id: args.id as string } });

        const result = data.deleteRequestRequisition;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting requisition: ${result.error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Request requisition deleted: ${result.id}`,
            },
          ],
        };
      },
    },
  ];
}
