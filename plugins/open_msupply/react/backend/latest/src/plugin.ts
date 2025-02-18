// To upload to server (after adding submodule to openmsupply repo locally)
// cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle -i '../client/packages/plugins/{plugin name}/backend' -u 'http://localhost:8000' --username 'test' --password 'pass'

import { BackendPlugins } from '@backendPlugins';
// Tree shaking working
import zipObject from 'lodash/zipObject';

// TODO Should come from settings
const DAY_LOOKBACK = 800;
const DAYS_IN_MONTH = 30;
const MONTHS_LEAD_TIME = 3;

const plugins: BackendPlugins = {
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

    // Fill all item_ids with default
    const response = zipObject(
      item_ids,
      item_ids.map(() => ({ average_monthly_consumption: 3 }))
    );

    sql_result.forEach(({ item_id, consumption }) => {
      response[item_id] = {
        average_monthly_consumption: consumption / (DAY_LOOKBACK / DAYS_IN_MONTH),
      };
    });

    return response;
  },
  transform_requisition_lines: ({ lines, requisition }) => {
    return {
      transformed_lines: lines.map(line => {
        const max_quantity =
          line.average_monthly_consumption *
          (requisition.max_months_of_stock + MONTHS_LEAD_TIME);
        const difference = max_quantity - line.available_stock_on_hand;
        const suggested_quantity = difference < 0 ? 0 : difference;
        return { ...line, suggested_quantity };
      }),
    };
  },
};

export { plugins };
