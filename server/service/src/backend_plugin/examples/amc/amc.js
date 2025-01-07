// To upload to server (from this dir):
// curl --form files='@amc.js' --form "config={};type=application/json" 'http://localhost:8000/plugin?type=AMC&variant-type=BOA_JS&code=amc_check'

// TODO type sharing and type sharing

// TODO Should come from settings
const DAY_LOOKBACK = 800;
const DAYS_IN_MONTH = 30;

let plugins = {
  average_monthly_consumption: ({ store_id, filter }) => {
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

    const sql_result = sql(sql_statement);
    const response = {};

    sql_result.forEach(({ item_id, consumption }) => {
      response[item_id] = {
        average_monthly_consumption: consumption / (DAY_LOOKBACK / DAYS_IN_MONTH),
      };
    });

    return response;
  },
};

export { plugins };
