import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { OmSupplyClient } from '../client.js';
import { PermissionsState } from '../permissions.js';
import { ToolDefinition, registerTools } from './registry.js';

import { systemQueryTools } from './system/queries.js';
import { itemQueryTools } from './items/queries.js';
import { stockQueryTools } from './stock/queries.js';
import { stockMutationTools } from './stock/mutations.js';
import { invoiceQueryTools } from './invoices/queries.js';
import { invoiceCountTools } from './invoices/counts.js';
import { invoiceMutationTools } from './invoices/mutations.js';
import { requisitionQueryTools } from './requisitions/queries.js';
import { requisitionMutationTools } from './requisitions/mutations.js';
import { stocktakeQueryTools } from './stocktakes/queries.js';
import { stocktakeMutationTools } from './stocktakes/mutations.js';
import { locationQueryTools } from './locations/queries.js';
import { locationMutationTools } from './locations/mutations.js';
import { purchaseOrderQueryTools } from './purchase_orders/queries.js';
import { purchaseOrderMutationTools } from './purchase_orders/mutations.js';
import { nameQueryTools } from './names/queries.js';
import { masterListQueryTools } from './master_lists/queries.js';
import { dashboardQueryTools } from './dashboard/queries.js';
import { reportQueryTools } from './reports/queries.js';
import { fileQueryTools } from './files/queries.js';
import { documentQueryTools } from './documents/queries.js';

export function registerAllTools(
  server: McpServer,
  client: OmSupplyClient,
  permissions: PermissionsState
): void {
  const allTools: ToolDefinition[] = [
    ...systemQueryTools(client),
    ...itemQueryTools(client),
    ...stockQueryTools(client),
    ...stockMutationTools(client),
    ...invoiceQueryTools(client),
    ...invoiceCountTools(client),
    ...invoiceMutationTools(client),
    ...requisitionQueryTools(client),
    ...requisitionMutationTools(client),
    ...stocktakeQueryTools(client),
    ...stocktakeMutationTools(client),
    ...locationQueryTools(client),
    ...locationMutationTools(client),
    ...purchaseOrderQueryTools(client),
    ...purchaseOrderMutationTools(client),
    ...nameQueryTools(client),
    ...masterListQueryTools(client),
    ...dashboardQueryTools(client),
    ...reportQueryTools(client),
    ...fileQueryTools(client),
    ...documentQueryTools(client),
  ];

  console.error(
    `Registered ${allTools.length} tools. Permissions are enforced at call time.`
  );

  registerTools(server, allTools, permissions);
}
