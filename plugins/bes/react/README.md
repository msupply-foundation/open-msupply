# bes-plugins

## Backend Plugin Functionality

    * graphql_query -> issue stock via outboundShipment

TODO:

1. Refactor code (better naming of things, trim generated graphql, move things to their own space )
2. ~~Figure out codegen work flow to work better.~~
3. ~~Better error handling and error messages. Handle edge cases.~~
4. Testing
5. ~~Improve Readme~~
6. Exchange BatchOutboundShipment with UpdateOutboundShipment (for readability)

### Installation

This was initially developed using the [open-msupply](https://github.com/msupply-foundation/open-msupply-plugins.git) repo, and the plugin installed as a submodule of the open-msupply repo. To read about plugins and modules, go to [plugins and submodules](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/plugins/README.md).

Run the two commands below from the '/server' folder of OMS

Generate the bundle.json (name it as you like) file

```
cargo run --bin remote_server_cli -- generate-plugin-bundle -i '../client/packages/plugins/besPlugin/' --out-file ../client/packages/plugins/besPlugin/bundle.json
```

Install bundle.json file

```
cargo run --bin remote_server_cli install-plugin-bundle --path ../client/packages/plugins/besPlugin/bundle.json --url=http://localhost:8000 --username=admin --password=pass
```

Alternatively, download the bundle.json from the root of the [bes-plugins](https://github.com/msupply-foundation/bes-plugins.git) repo and install the plugin at the '/server' folder where open-msupply server runs

```
cargo run --bin remote_server_cli install-plugin-bundle --path ../path/to/plugin/bundle/bundle.json --url=http://localhost:8000 --username=admin --password=pass
```

### graphql_query params

request structure

```json
{
  "input": {
    "customerFilter": { "isStore": true, "isVisible": true }, // NameFilterInput type of 'names' graphql endpoint. First match is used for order.
    "itemFilter": { "code": { "equalTo": "AR33197" } }, // ItemFilterInput type of 'items' graphql endpoint. First match is used for order.
    "quantity": 60 // Quantity of units.  Currently if packsize > 'quantity', 1 pack will be shipped if there is enough stock.
  }
}
```

response structure

```json
{
  "message": "Issued stock for store: Kamo Regional Warehouse, item: AR33197, quantity: 60",
  "success": true
}
```

example graphql query

```gql
query GraphqlPlugin($input: JSON!) {
  pluginGraphqlQuery(pluginCode: "bes-plugins", storeId: "8D967C2618BE4D78B3A6FAD6C1C8FF25", input: $input)
}
```

### error responses

Currently api will return "success" : false, and a message in the following scenarios :

- No active stores are found to dispatch items from
- Dispatching store has no stock available for item requested
- No customer retrieved from "customerFilter" input params
- No item retrieved from "itemFilter" input params

If api should fail during the attempt of inserting and confirming the Outbound Shipment, api will return "success": true, with a "message": "error message text" attempting to describe error that has occurred. example:

```json
{
  "message": "Insert order failed. Failed to issue the stock for item code: 12345, quantity: 10, customer: Customer Name, error: no insert lines returned",
  "success": true
}
```

## Frontend Plugin Functionality

    * None at present
