# bes-plugins

## Backend Plugin Functionality

    * graphql_query -> issue stock via outboundShipment

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

```input json
{
  "input": {
    "customerFilter": { "isStore": true, "isVisible": true }, // NameFilterInput type of 'names' graphql endpoint
    "itemFilter": { "code": { "equalTo": "AR33197" } }, // ItemFilterInput type of 'items' graphql endpoint
    "quantity": 60 // Quantity of units
  }
}
```

```response json example
{
      "message": "Issued stock for store: Kamo Regional Warehouse, item: AR33197, quantity: 60",
      "success": true
}
```

```example graphql query
query GraphqlPlugin($input: JSON!) {
  pluginGraphqlQuery(
    pluginCode: "bes-plugins"
    storeId: "8D967C2618BE4D78B3A6FAD6C1C8FF25"
    input: $input
  )
}
```

## Frontend Plugin Functionality

    * None at present
