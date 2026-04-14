# bes-plugins

- [bes-plugins](#bes-plugins)
  - [Functionality](#functionality)
    - [graphql_query params](#graphql_query-params)
    - [error responses](#error-responses)
  - [Dev](#dev)
    - [Dev troubleshooting](#dev-troubleshooting)
  - [Installation on servers](#installation-on-servers)

## Functionality

This currently is a backend only plugin. It attempts to allocate item line batches following: `FEFO unexpired > LEFO expired > nothing` (First Expiring First Out, Last Expired First Out).

First try to allocate unexpired batch lines (if expiry date is 'null', also allocated), then expired batch lines. If all stock is exhausted, then a placeholder line is added. If no stock available, one placeholder line is extended for the whole amount of units requested.

Item batch lines that are 'onHold', or if it's location (if any) is 'onHold', are excluded entirely.

If the amount of requested units to be supplied are all allocated, the Outbound Shipment status will be changed to "Shipped". If Outbound Shipment has a placeholder line, the status is left as "New".

It is possible to "oversupply" an item in the case that "packSizes" of batches are greater than 1. i.e 'numberOfUnits' : 25, packSize of batch = 10, total units supplied would be 30 (packsize \* 3). Currently, no partial "packSize" is calculated, only entire packs.

### graphql_query params

request structure

```jsonc
{
  "input": {
    "invoiceId": "UUID", // Optional.  If no value given, a random UUID will be assigned to Outbound Shipment
    "customerCode": "string", // string for customerCode
    "items": [
      {
        "itemCode": "AR33197", // string for item code search
        "numberOfUnits": 60,
      },
    ],
  },
}
```

response structure

```jsonc
{
  "message": "Failed to issued stock from store code: Kopu, for customer: Adamawa State Cold Store, invoiceId: 012578f4-5277-4b69-a9bc-dd7cb8b6f4d0333, items count: 2. Operation has been rolled back.",
  "success": false,
  "items": [
    {
      "message": "Inserted itemCode: 041011, Number of units requested: 500, Allocated Units: 100, Placeholder Units: 400",
      "success": true,
      "itemCode": "041011",
    },
    {
      "message": "No item found for itemCode: 0300634",
      "success": false,
      "itemCode": "0300634",
    },
  ],
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

API will return "success" : false, a message, and items: [], in the following scenarios :

- No active stores are found to dispatch items from
- No customer retrieved from "customerCode" input param
- An existing UUID is given for "invoiceId" input param

API will return "success: false", a message, and items: [...item results]

- No item retrieved from "itemCode" input param
- Invalid or empty parameters are passed

If all item lines were successfully either allocated, or had a placeholder inserted, "success: true", message: "...", items: [...item results] will be returned.

## Dev

Have OMS cloned, and cd into the `/server` folder.

Add this repo as a submodule in our plugins directory:

```sh
git submodule add https://github.com/msupply-foundation/bes-plugins ../client/packages/plugins/bes-plugins
```

To build and install the plugin bundle, run:

```sh
cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle -i '../client/packages/plugins/bes-plugins' --url http://localhost:8000 --username admin --password pass
```

### Dev troubleshooting

This was initially developed using the [open-msupply](https://github.com/msupply-foundation/open-msupply-plugins.git) repo, and the plugin installed as a submodule of the open-msupply repo. To read about plugins and modules, go to [plugins and submodules](https://github.com/msupply-foundation/open-msupply/blob/develop/client/packages/plugins/README.md).

## Installation on servers

Download the latest bundle.json from the root of the [bes-plugins](https://github.com/msupply-foundation/bes-plugins.git) repo and install the plugin at the '/server' folder where open-msupply server runs

```sh
remote_server_cli.exe install-plugin-bundle --path ../path/to/plugin/bundle/bundle.json --url=http://localhost:8000 --username=admin --password=pass
```
