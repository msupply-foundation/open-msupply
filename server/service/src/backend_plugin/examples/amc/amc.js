// To upload to server (from this dir):
// cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle -i './service/src/backend_plugin/examples/amc' -u 'http://localhost:8000' --username 'test' --password 'pass'
// OR
// cargo run --bin remote_server_cli -- generate-plugin-bundle -i './service/src/backend_plugin/examples/amc' -o 'check.json'
// Can install via CLI
// cargo run --bin remote_server_cli -- install-plugin-bundle --path 'check.json' -u 'http://localhost:8000' --username 'test' --password 'pass'
// Or can install via curl
// cargo run --bin remote_server_cli -- generate-plugin-bundle -i './service/src/backend_plugin/examples/amc' -o 'check.json'
// curl -H 'Content-Type: application/json' --data '{"query":"query MyQuery {authToken(password: \"pass\", username: \"Admin\") {... on AuthToken {token}... on AuthTokenError {error {description}}}}","variables":{}}' 'http://localhost:8000/graphql'
// TOKEN=token from above
// curl --form files='@check.json' -v -H 'Cookie: auth={"token":"'$TOKEN'"}' 'http://localhost:8000/upload'
// FILE_ID=file id from above
// curl -H 'Authorization: Bearer '${TOKEN} -H 'Content-Type: application/json' --data '{"query":"query MyQuery { centralServer { plugin { uploadedPluginInfo(fileId: \"'$FILE_ID'\") {... on PluginInfoNode {backendPluginCodes}... on UploadedPluginError {error}}} }}","variables":{}}' 'http://localhost:8000/graphql'
// Above would list codes in the bundle, next to add plugins
// curl -H 'Authorization: Bearer '${TOKEN} -H 'Content-Type: application/json' --data '{"query":"mutation MyMutation { centralServer { plugins { installUploadedPlugin(fileId: \"'$FILE_ID'\") { backendPluginCodes } } } }" }' 'http://localhost:8000/graphql'
// Above would add uploaded plugin to backend_plugin table and bind it

// TODO Should come from settings
const DAY_LOOKBACK = 800;
const DAYS_IN_MONTH = 30;

let plugins = {
  average_monthly_consumption: ({ store_id, item_ids }) => {
    const now = new Date();
    now.setDate(now.getDate() - DAY_LOOKBACK);

    const sql_date = now.toJSON().split('T')[0];
    const sql_item_ids = '"' + item_ids.join('","') + '"';

    // Sqlite only
    const sql_statement = `
        SELECT json_object('item_id', item_id, 'consumption', consumption) as json_row 
        FROM (
        SELECT item_id, sum(quantity) as consumption FROM consumption WHERE 
        store_id = "${store_id}" 
        AND item_id in (${sql_item_ids}) 
        AND date > "${sql_date}"
        GROUP BY item_id
        )
    `;

    const sql_result = sql(sql_statement);
    const response = {};

    // Fill all item_ids with default
    item_ids.forEach((itemId) => (response[itemId] = { average_monthly_consumption: 1 }));

    sql_result.forEach(({ item_id, consumption }) => {
      response[item_id] = {
        average_monthly_consumption: consumption / (DAY_LOOKBACK / DAYS_IN_MONTH),
      };
    });

    return response;
  },
};

export { plugins };
