import { ToolDefinition } from '../registry.js';
import { OmSupplyClient } from '../../client.js';
import { PermissionsState, isToolAllowed } from '../../permissions.js';
import { z } from 'zod';

type OperationType = 'query' | 'mutation' | 'subscription';

/**
 * Best-effort detection of the GraphQL operation type from the document text.
 * Strips `#` line comments and leading whitespace, then looks for the leading
 * operation keyword. An anonymous `{ ... }` shorthand is a query.
 */
function detectOperationType(document: string): OperationType {
  const withoutComments = document.replace(/#[^\n\r]*/g, '');
  const match = withoutComments.match(/\b(query|mutation|subscription)\b/);
  // If the first non-whitespace char is `{`, it's a shorthand query; otherwise
  // the first operation keyword we find wins.
  const firstToken = withoutComments.trimStart()[0];
  if (firstToken === '{') return 'query';
  if (match) return match[1] as OperationType;
  return 'query';
}

export function graphqlQueryTools(
  client: OmSupplyClient,
  permissions: PermissionsState
): ToolDefinition[] {
  return [
    {
      name: 'graphql',
      category: 'graphql',
      // Registered as a query so it's available in read-only mode; the handler
      // additionally gates mutation documents behind the mutation permission.
      kind: 'query',
      description:
        'Run an arbitrary GraphQL query or mutation against the Open mSupply server. ' +
        'Use this as an escape hatch when no dedicated tool covers the endpoint you need. ' +
        'Prefer a purpose-built tool when one exists — it returns cleaner, summarised output. ' +
        'The active store header is sent automatically; reference variables with $name and pass them via `variables`. ' +
        'Returns the raw JSON response. Mutations require the mutation permission to be enabled.',
      schema: {
        query: z
          .string()
          .describe(
            'The GraphQL document to execute, e.g. "query ($id: String!) { ... }" or a "mutation { ... }".'
          ),
        variables: z
          .record(z.unknown())
          .optional()
          .describe('Optional variables object referenced by the query document.'),
      },
      handler: async (args) => {
        const document = args.query as string;
        const variables = (args.variables as Record<string, unknown>) ?? undefined;

        const operationType = detectOperationType(document);
        if (operationType === 'mutation') {
          const allowed = isToolAllowed(
            { name: 'graphql', category: 'graphql', kind: 'mutation' },
            permissions.current
          );
          if (!allowed) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text:
                    'This GraphQL document is a mutation, but mutations are disabled by the current permission configuration. ' +
                    'Enable mutations (e.g. read-write mode) to run it.',
                },
              ],
              isError: true,
            };
          }
        }

        const data = await client.query<Record<string, unknown>>(document, variables);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      },
    },
  ];
}
