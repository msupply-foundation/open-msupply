import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isToolAllowed, PermissionsState, ToolKind } from '../permissions.js';
import { z } from 'zod';

export interface ToolDefinition {
  name: string;
  category: string;
  kind: ToolKind;
  description: string;
  schema: Record<string, z.ZodType>;
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;
}

export function registerTools(
  server: McpServer,
  tools: ToolDefinition[],
  permissions: PermissionsState
): void {
  for (const tool of tools) {
    const wrappedHandler = async (args: Record<string, unknown>) => {
      if (
        !isToolAllowed(
          { name: tool.name, category: tool.category, kind: tool.kind },
          permissions.current
        )
      ) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Tool "${tool.name}" is disabled by the current permission configuration.`,
            },
          ],
          isError: true,
        };
      }
      return tool.handler(args);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (server.tool as any)(tool.name, tool.description, tool.schema, wrappedHandler);
  }
}
