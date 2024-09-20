const { sql } = Host.getFunctions();

// Would need to install extism-js: https://github.com/extism/js-pdk?tab=readme-ov-file#linux-macos
// To build (from this dir): extism-js ./amc.js -i amc.d.ts -o amc.wasm
// To upload to server (from this dir): curl --form files='@amc.wasm' --form "config={};type=application/json" 'http://localhost:8000/plugin?plugin-type=AMC'

// TODO type sharing
// TODO build scripts to use typescript (as per extism js)

// TODO Should come from settings
const DAY_LOOKBACK = 800;
const DAYS_IN_MONTH = 30;

function amc() {
  const { store_id, filter } = JSON.parse(Host.inputString());

  const item_ids = filter.item_id.equal_any;

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

  const sql_query = {
    statement: sql_statement,
    parameters: [],
  };

  const mem = Memory.fromJsonObject(sql_query);
  let offset = sql(mem.offset);

  const sql_result = Memory.find(offset).readJsonObject();

  const response = {};
  sql_result.rows.forEach(({ item_id, consumption }) => {
    response[item_id] = {
      average_monthly_consumption: consumption / (DAY_LOOKBACK / DAYS_IN_MONTH),
    };
  });

  Host.outputString(JSON.stringify(response));
}

module.exports = { amc };
