# Open mSupply MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that connects AI assistants to [Open mSupply](https://github.com/msupply-foundation/open-msupply) instances. Enables querying inventory, stock levels, shipments, and more through natural language.

## Prerequisites

- Node.js 18+
- A running Open mSupply server instance

## Setup

### Install from source

```bash
cd mcp-server
npm install
npm run build
```

### Configuration

The server is configured via environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `OMSUPPLY_URL` | Yes | Open mSupply server URL (e.g. `http://localhost:8000`) |
| `OMSUPPLY_USERNAME` | Yes | Login username |
| `OMSUPPLY_PASSWORD` | Yes | Login password |
| `OMSUPPLY_STORE_ID` | No | Default store ID. Can be discovered using the `list_stores` tool. |

## Usage with AI Tools

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "open-msupply": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "OMSUPPLY_URL": "http://localhost:8000",
        "OMSUPPLY_USERNAME": "your-username",
        "OMSUPPLY_PASSWORD": "your-password",
        "OMSUPPLY_STORE_ID": "your-store-id"
      }
    }
  }
}
```

### Claude Code

Add to your Claude Code MCP settings:

```json
{
  "mcpServers": {
    "open-msupply": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "OMSUPPLY_URL": "http://localhost:8000",
        "OMSUPPLY_USERNAME": "your-username",
        "OMSUPPLY_PASSWORD": "your-password"
      }
    }
  }
}
```

### Cursor / VS Code

Add to your MCP configuration following the editor's MCP setup guide, using the same command and environment variables as above.

## Available Tools

### Store & System
| Tool | Description |
|------|-------------|
| `list_stores` | List all available stores (use to discover store IDs) |
| `get_store` | Get store details by ID |
| `get_server_info` | Get server version and connection status |

### Items & Stock
| Tool | Description |
|------|-------------|
| `search_items` | Search items by name or code with stock stats |
| `get_item` | Get detailed item info including available batches |
| `get_stock_lines` | Get current stock levels, batches, and expiry dates |
| `get_stock_counts` | Summary of stock health (expired, low, out of stock) |
| `get_item_ledger` | Transaction history for a specific item |

### Invoices & Shipments
| Tool | Description |
|------|-------------|
| `list_invoices` | List invoices filtered by type, status, or party |
| `get_invoice` | Get full invoice details with line items |
| `get_outbound_shipment_counts` | Outbound shipment activity counts |
| `get_inbound_shipment_counts` | Inbound shipment activity counts |

### Names & Catalogs
| Tool | Description |
|------|-------------|
| `search_names` | Search suppliers, customers, and facilities |
| `get_master_lists` | Get item master lists (catalogs) |

### Dashboard
| Tool | Description |
|------|-------------|
| `get_dashboard_summary` | Comprehensive overview of inventory, shipments, and requisitions |
| `get_requisition_counts` | Requisition counts by status |

## Example Prompts

Once configured, you can ask your AI assistant things like:

- "What's the current stock status of our store?"
- "Show me items that are expiring soon"
- "Search for paracetamol in our inventory"
- "How many outbound shipments haven't been sent yet?"
- "List all our suppliers"
- "Give me a dashboard overview"

## Development

```bash
npm run dev    # Watch mode - recompiles on changes
npm run build  # One-time build
npm start      # Run the server
```

## Architecture

The MCP server acts as a thin translation layer:

```
AI Assistant <--stdio/MCP--> MCP Server <--GraphQL/HTTP--> Open mSupply Server
```

It authenticates with the Open mSupply GraphQL API using username/password credentials, caches the auth token, and translates MCP tool calls into GraphQL queries.

## License

AGPL-3.0 - Same as Open mSupply
