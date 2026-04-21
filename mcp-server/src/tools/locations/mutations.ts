import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { formatRecord } from '../../types.js';

export function locationMutationTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'insert_location',
      category: 'locations',
      kind: 'mutation',
      description:
        'Create a new storage location',
      schema: {
        id: z.string().describe('Unique ID for the new location'),
        name: z.string().describe('Location name'),
        code: z.string().describe('Location code'),
        onHold: z.boolean().optional().describe('Whether the location is on hold'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation insertLocation(
            $storeId: String!
            $input: InsertLocationInput!
          ) {
            insertLocation(storeId: $storeId, input: $input) {
              __typename
              ... on LocationNode {
                id
                name
                code
                onHold
              }
              ... on InsertLocationError {
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
          name: args.name as string,
          code: args.code as string,
        };
        if (args.onHold !== undefined) input.onHold = args.onHold as boolean;

        const data = await client.query<{
          insertLocation: {
            __typename: string;
            id?: string;
            name?: string;
            code?: string;
            onHold?: boolean;
            error?: { description: string };
          };
        }>(mutation, { storeId, input });

        const result = data.insertLocation;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error inserting location: ${result.error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Location created:\n${formatRecord(result as unknown as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
    {
      name: 'update_location',
      category: 'locations',
      kind: 'mutation',
      description:
        'Update an existing storage location',
      schema: {
        id: z.string().describe('The location ID to update'),
        name: z.string().optional().describe('Location name'),
        code: z.string().optional().describe('Location code'),
        onHold: z.boolean().optional().describe('Whether the location is on hold'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation updateLocation(
            $storeId: String!
            $input: UpdateLocationInput!
          ) {
            updateLocation(storeId: $storeId, input: $input) {
              __typename
              ... on LocationNode {
                id
                name
                code
                onHold
              }
              ... on UpdateLocationError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const input: Record<string, unknown> = { id: args.id as string };
        if (args.name !== undefined) input.name = args.name as string;
        if (args.code !== undefined) input.code = args.code as string;
        if (args.onHold !== undefined) input.onHold = args.onHold as boolean;

        const data = await client.query<{
          updateLocation: {
            __typename: string;
            id?: string;
            name?: string;
            code?: string;
            onHold?: boolean;
            error?: { description: string };
          };
        }>(mutation, { storeId, input });

        const result = data.updateLocation;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error updating location: ${result.error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Location updated:\n${formatRecord(result as unknown as Record<string, unknown>)}`,
            },
          ],
        };
      },
    },
    {
      name: 'delete_location',
      category: 'locations',
      kind: 'mutation',
      description:
        'Delete a storage location',
      schema: {
        id: z.string().describe('The location ID to delete'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const mutation = gql`
          mutation deleteLocation(
            $storeId: String!
            $input: DeleteLocationInput!
          ) {
            deleteLocation(storeId: $storeId, input: $input) {
              __typename
              ... on DeleteResponse {
                id
              }
              ... on DeleteLocationError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          deleteLocation: {
            __typename: string;
            id?: string;
            error?: { description: string };
          };
        }>(mutation, { storeId, input: { id: args.id as string } });

        const result = data.deleteLocation;
        if (result.__typename.includes('Error')) {
          return {
            content: [
              {
                type: 'text',
                text: `Error deleting location: ${result.error?.description ?? 'Unknown error'}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Location deleted: ${result.id}`,
            },
          ],
        };
      },
    },
  ];
}
