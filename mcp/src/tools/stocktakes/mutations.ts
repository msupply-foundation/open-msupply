import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { formatRecord } from '../../types.js';

export function stocktakeMutationTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'insert_stocktake',
      category: 'stocktakes',
      kind: 'mutation',
      description:
        'Create a new stocktake',
      schema: {
        id: z.string().describe('Unique ID for the new stocktake'),
        comment: z.string().optional().describe('Comment'),
        description: z.string().optional().describe('Description'),
        isAllItemsStocktake: z
          .boolean()
          .optional()
          .describe('Whether to include all items'),
        locationId: z.string().optional().describe('Filter by location ID'),
        masterListId: z.string().optional().describe('Filter by master list ID'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation insertStocktake(
            $storeId: String!
            $input: InsertStocktakeInput!
          ) {
            insertStocktake(storeId: $storeId, input: $input) {
              __typename
              ... on StocktakeNode {
                id
                stocktakeNumber
                status
              }
            }
          }
        `;

        const input: Record<string, unknown> = { id: args.id as string };
        if (args.comment !== undefined) input.comment = args.comment as string;
        if (args.description !== undefined) input.description = args.description as string;
        if (args.isAllItemsStocktake !== undefined) input.isAllItemsStocktake = args.isAllItemsStocktake as boolean;
        if (args.locationId !== undefined) input.locationId = args.locationId as string;
        if (args.masterListId !== undefined) input.masterListId = args.masterListId as string;

        const data = await client.query<{
          insertStocktake: {
            __typename: string;
            id?: string;
            stocktakeNumber?: number;
            status?: string;
            error?: { description: string };
          };
        }>(mutation, { storeId, input });

        const result = data.insertStocktake;
        if (result.__typename !== 'StocktakeNode') {
          return {
            content: [
              {
                type: 'text',
                text: `Error inserting stocktake: server returned ${result.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Stocktake created:\n${formatRecord(result as unknown as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
    {
      name: 'update_stocktake',
      category: 'stocktakes',
      kind: 'mutation',
      description:
        'Update an existing stocktake',
      schema: {
        id: z.string().describe('The stocktake ID to update'),
        status: z
          .enum(['FINALISED'])
          .optional()
          .describe('Update status (can only be set to FINALISED)'),
        comment: z.string().optional().describe('Comment'),
        description: z.string().optional().describe('Description'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation updateStocktake(
            $storeId: String!
            $input: UpdateStocktakeInput!
          ) {
            updateStocktake(storeId: $storeId, input: $input) {
              __typename
              ... on StocktakeNode {
                id
                stocktakeNumber
                status
              }
            }
          }
        `;

        const input: Record<string, unknown> = { id: args.id as string };
        if (args.status !== undefined) input.status = args.status as string;
        if (args.comment !== undefined) input.comment = args.comment as string;
        if (args.description !== undefined) input.description = args.description as string;

        const data = await client.query<{
          updateStocktake: {
            __typename: string;
            id?: string;
            stocktakeNumber?: number;
            status?: string;
            error?: { description: string };
          };
        }>(mutation, { storeId, input });

        const result = data.updateStocktake;
        if (result.__typename !== 'StocktakeNode') {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating stocktake: server returned ${result.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Stocktake updated:\n${formatRecord(result as unknown as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
    {
      name: 'delete_stocktake',
      category: 'stocktakes',
      kind: 'mutation',
      description:
        'Delete a stocktake',
      schema: {
        id: z.string().describe('The stocktake ID to delete'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation deleteStocktake(
            $storeId: String!
            $input: DeleteStocktakeInput!
          ) {
            deleteStocktake(storeId: $storeId, input: $input) {
              __typename
              ... on DeleteResponse {
                id
              }
            }
          }
        `;

        const data = await client.query<{
          deleteStocktake: {
            __typename: string;
            id?: string;
            error?: { description: string };
          };
        }>(mutation, { storeId, input: { id: args.id as string } });

        const result = data.deleteStocktake;
        if (result.__typename !== 'DeleteResponse') {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting stocktake: server returned ${result.__typename}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Stocktake deleted: ${result.id}`,
            },
          ],
        };
      },
    },
  ];
}
