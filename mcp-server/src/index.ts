#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { OmSupplyClient } from './client.js';
import { registerAllTools } from './tools/index.js';

async function main() {
  const config = loadConfig();

  if (config.allowSelfSigned) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  }

  const client = new OmSupplyClient(config);

  const server = new McpServer({
    name: 'open-msupply',
    version: '0.1.0',
  });

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
