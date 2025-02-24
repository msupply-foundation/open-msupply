// To upload to server (after adding submodule to openmsupply repo locally)
// cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle -i '../client/packages/plugins/{plugin name}/backend' -u 'http://localhost:8000' --username 'test' --password 'pass'

import { BackendPlugins } from '@backendPlugins';
// Tree shaking working
import zipObject from 'lodash/zipObject';
import { uuidv7 } from 'uuidv7';

// TODO Should come from settings
const DAY_LOOKBACK = 800;
const DAYS_IN_MONTH = 30;

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
        average_monthly_consumption:
          consumption / (DAY_LOOKBACK / DAYS_IN_MONTH),
      };
    });

    return response;
  },
  transform_requisition_lines: ({ lines, requisition }) => {
    const months_lead_time = get_store_preferences(
      requisition.store_id
    ).months_lead_time;

    // need to share this
    const dataIdentifier = 'AGGREGATE_AMC_REQUISITION_LINE';
    const pluginCode = 'AGGREGATE_AMC';

    return {
      transformed_lines: lines.map(line => {
        const max_quantity =
          line.average_monthly_consumption *
          (requisition.max_months_of_stock + months_lead_time);
        const difference = max_quantity - line.available_stock_on_hand;
        const suggested_quantity = difference < 0 ? 0 : difference;
        return { ...line, suggested_quantity };
      }),
      // Here we need to do sql query for plugin data (another reason why plugin data should be on the record)
      plugin_data: lines.map(line => ({
        id: uuidv7(),
        store_id: requisition.store_id,
        plugin_code: pluginCode,
        related_record_id: line.id,
        // need to share this
        data_identifier: dataIdentifier,
        data: String(Math.random() * 50),
      })),
    };
  },
};

export { plugins };
