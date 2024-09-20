// Would need to install extism-js: https://github.com/extism/js-pdk?tab=readme-ov-file#linux-macos
// To build (from this dir): extism-js ./suggested_quantity.js -i suggested_quantity.d.ts -o suggested_quantity.wasm
// To upload to server (from this dir): curl --form files='@suggested_quantity.wasm' --form "config={\"allowed_hosts\":[\"localhost\"], \"plugin_config\": { \"server_url\": \"http://localhost:3000\"}};type=application/json" 'http://localhost:8000/plugin?plugin-type=SUGGESTEDQUANTITY'

// Run test json server with: npx json-server --watch test-db.json, edit test-db.json to include item ids in your datafile
// Update above 'upload to server' query if your json server endpoint is not running on 3000

// TODO type sharing
// TODO build scripts to use typescript (as per extism js)

function suggested_quantity() {
  const { items, requisition } = JSON.parse(Host.inputString());

  const config = JSON.parse(Config.get('config'));
  const item_ids = Object.keys(items);

  const item_ids_url_param = `id=${item_ids.join(',id=')}`;

  // Can use requisition.store_id, but not bothering with mocking that in API atm
  const request = {
    url: `${config.server_url}/items?${item_ids_url_param}`,
  };

  try {
    const http_response = Http.request(request);

    const response_body = JSON.parse(http_response.body);

    const response = {};
    item_ids.forEach((item_id) => {
      response[item_id] = {
        suggested_quantity: response_body.find((r) => r.id === item_id)?.suggested || 0,
      };
    });

    Host.outputString(JSON.stringify(response));
  } catch (e) {
    Host.outputString(JSON.stringify({}));
  }
}

module.exports = { suggested_quantity };
