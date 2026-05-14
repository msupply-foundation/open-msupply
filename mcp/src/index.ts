#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { OmSupplyClient } from './client.js';
import { registerAllTools } from './tools/index.js';
import { PermissionsState } from './permissions.js';

async function main() {
  const { server: serverConfig, permissions: basePermissions } = loadConfig();

  if (serverConfig.allowSelfSigned) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const permissionsState = new PermissionsState(basePermissions);
  const client = new OmSupplyClient(serverConfig, basePermissions);
  client.attachPermissions(permissionsState);

  const server = new McpServer({
    name: 'open-msupply',
    version: '0.2.0',
  });

  registerAllTools(server, client, permissionsState);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
