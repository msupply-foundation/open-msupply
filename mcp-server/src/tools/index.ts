import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OmSupplyClient } from '../client.js';
import { registerStoreTools } from './stores.js';
import { registerItemTools } from './items.js';
import { registerStockTools } from './stock.js';
import { registerInvoiceTools } from './invoices.js';
import { registerDashboardTools } from './dashboard.js';

export function registerAllTools(server: McpServer, client: OmSupplyClient) {
  registerStoreTools(server, client);
  registerItemTools(server, client);
  registerStockTools(server, client);
  registerInvoiceTools(server, client);
  registerDashboardTools(server, client);
}
