import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { z } from 'zod';
import { gql } from 'graphql-request';
import { formatRecord } from '../../types.js';

export function stockMutationTools(client: OmSupplyClient): ToolDefinition[] {
  return [
    {
      name: 'update_stock_line',
      category: 'stock',
      kind: 'mutation',
      description:
        'Update a stock line (batch, expiry, location, hold status, etc.)',
      schema: {
        id: z.string().describe('The stock line ID to update'),
        batch: z.string().optional().describe('Batch number'),
        expiryDate: z.string().optional().describe('Expiry date (YYYY-MM-DD)'),
        costPricePerPack: z.number().optional().describe('Cost price per pack'),
        sellPricePerPack: z.number().optional().describe('Sell price per pack'),
        onHold: z.boolean().optional().describe('Whether to place on hold'),
        locationId: z.string().optional().describe('Location ID to move stock to'),
        storeId: z
          .string()
          .optional()
          .describe('Store ID (uses active store if not provided)'),
      },
      handler: async (args) => {
        const storeId = client.requireStoreId(args.storeId as string | undefined);
        const input: Record<string, unknown> = { id: args.id };
        if (args.batch !== undefined) input.batch = args.batch;
        if (args.expiryDate !== undefined) input.expiryDate = args.expiryDate;
        if (args.costPricePerPack !== undefined) input.costPricePerPack = args.costPricePerPack;
        if (args.sellPricePerPack !== undefined) input.sellPricePerPack = args.sellPricePerPack;
        if (args.onHold !== undefined) input.onHold = args.onHold;
        if (args.locationId !== undefined) input.locationId = args.locationId;

        const query = gql`
          mutation updateStockLine(
            $storeId: String!
            $input: UpdateStockLineInput!
          ) {
            updateStockLine(storeId: $storeId, input: $input) {
              ... on StockLineNode {
                __typename
                id
                batch
                expiryDate
                packSize
                totalNumberOfPacks
                availableNumberOfPacks
                onHold
                locationName
              }
              ... on UpdateStockLineError {
                __typename
                error {
                  description
                }
              }
            }
          }
        `;

        const data = await client.query<{
          updateStockLine: Record<string, unknown>;
        }>(query, { storeId, input });

        const result = data.updateStockLine;
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
              text: `Stock line updated:\n${formatRecord(result)}`,
            },
          ],
        };
      },
    },
  ];
}
