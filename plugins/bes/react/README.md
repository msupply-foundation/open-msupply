# bes-plugins

## Backend Plugin Functionality

    * graphql_query -> issue stock via outboundShipment

TODO:

1. ~~Refactor code (better naming of things, trim generated graphql, move things to their own space )~~
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

### general functionality

- attempts to allocate item line batches following: `FEFO unexpired > LEFO expired > nothing` (First Expiring First Out, Last Expired First Out).

First try to allocate unexpired batch lines (if expiry date is 'null', also allocated), then expired batch lines. If all stock is exhausted, then a placeholder line is added. If no stock available, one placeholder line is extended for the whole amount of units requested.

Item batch lines that are 'onHold', or if it's location (if any) is 'onHold', are excluded entirely.

If the amount of requested units to be supplied are all allocated, the Outbound Shipment status will be changed to "Shipped". If Outbound Shipment has a placeholder line, the status is left as "New".

It is possible to "oversupply" an item in the case that "packSizes" of batches are greater than 1. i.e 'numberOfUnits' : 25, packSize of batch = 10, total units supplied would be 30 (packsize \* 3). Currently, no partial "packSize" is calculated, only entire packs.

### graphql_query params

request structure

```jsonc
{
  "input": {
    "customerCode": "string", // string for customerCode
    "universalCode": "AR33197", // string for universalCode search
    "numberOfUnits": 60,
  },
}
```

response structure

```json
{
  "message": "Issued stock for store: Kamo Regional Warehouse, item: AR33197, quantity allocated: 50, quantity on placeholder: 30",
  "success": true
}
```

example graphql query (where $input is a JSON structure with above mentioned request structure)

```gql
query GraphqlPlugin($input: JSON!) {
  pluginGraphqlQuery(
    pluginCode: "bes-plugins"
    storeId: "8D967C2618BE4D78B3A6FAD6C1C8FF25"
    input: $input
  )
}
```

### error responses

Currently api will return "success" : false, and a message in the following scenarios :

- No active stores are found to dispatch items from
- No customer retrieved from "customerCode" input param
- No item retrieved from "universalCode" input param
- Invalid or empty parameters are passed

If api should fail during the attempt of inserting the Outbound Shipment, or any of the lines, api will return `"success": false, with a "message": "error message text"` attempting to describe error that has occurred. <b>If an error occurs at any of these stages, entire Outbound Shipment is rolled back.</b> example:

```jsonc
{
  "message": "Insert order failed. Failed to issue the stock for item code: 12345, quantity: 10, customer: Customer Name, error: no insert lines returned",
  "success": true,
}
```

## Frontend Plugin Functionality

    * None at present
