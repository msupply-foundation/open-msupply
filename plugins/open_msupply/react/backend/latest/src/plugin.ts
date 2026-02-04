// To upload to server (after adding submodule to openmsupply repo locally)
// cargo run --bin remote_server_cli -- generate-and-install-plugin-bundle -i '../client/packages/plugins/{plugin name}/backend' -u 'http://localhost:8000' --username 'test' --password 'pass'

import { BackendPlugins } from '@common/types';
import { ChangelogFilter } from '@common/generated/ChangelogFilter';
import { sqlDateTime, sqlList, sqlQuery } from '@common/utils';
import { Graphql } from '../../../shared/types';
// Tree shaking working
import zipObject from 'lodash/zipObject';
import { uuidv7 } from 'uuidv7';
import { name as pluginCode } from '../package.json';

// TODO Should come from settings
const DAY_LOOKBACK = 800;
const DAYS_IN_MONTH = 30;

const plugins: BackendPlugins = {
  average_monthly_consumption: ({ store_id, item_ids }) => {
    const now = new Date();
    now.setDate(now.getDate() - DAY_LOOKBACK);

    const sql_result = sqlQuery(
      ['item_id', 'consumption'],
      `
        SELECT item_id, sum(quantity) as consumption FROM consumption WHERE 
        store_id = '${store_id}' 
        AND item_id in ${sqlList(item_ids)}
        AND date > '${sqlDateTime(now)}'
        GROUP BY item_id
      `
    );

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
  transform_request_requisition_lines: ({ context, lines, requisition }) => {
    switch (context) {
      case 'InsertProgramRequestRequisition':
      case 'AddFromMasterList':
      case 'UpdateRequestRequisition':
      case 'InsertRequestRequisitionLine':
        // Can do for different actions or do exhaustive match here
        break;
      default:
        // Can also try/catch ignore this if you only want compilation to fail but plugin to still work when new variant is added
        assertUnreachable(context);
    }

    const months_lead_time = get_store_preferences(
      requisition.store_id
    ).months_lead_time;

    // need to share this
    const dataIdentifier = 'AGGREGATE_AMC_REQUISITION_LINE';

    const pluginData = get_plugin_data({
      store_id: { equal_to: requisition.store_id },
      plugin_code: { equal_to: pluginCode },
      data_identifier: { equal_to: dataIdentifier },
      related_record_id: { equal_any: lines.map(({ id }) => id) },
    });

    const sql_result = getAggregatedAmc(
      requisition.store_id,
      lines.map(({ item_link_id }) => item_link_id)
    );

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
        id:
          pluginData.find(
            ({ related_record_id }) => related_record_id === line.id
          )?.id || uuidv7(),
        store_id: requisition.store_id,
        plugin_code: pluginCode,
        related_record_id: line.id,
        // need to share this
        data_identifier: dataIdentifier,
        data: String(
          sql_result
            .filter(({ item_id }) => item_id === line.item_link_id)
            .reduce((acc, row) => acc + row.average_monthly_consumption, 0)
        ),
      })),
    };
  },
  graphql_query: ({ store_id, input: inputUntyped }): Graphql['output'] => {
    const input = inputUntyped as Graphql['input'];

    switch (input.type) {
      case 'echo':
        return { type: 'echo', echo: input.echo };
      case 'aggregateAmc':
        return {
          type: 'aggregateAmc',
          stats: getAggregatedAmc(store_id, input.itemIds).map(row => ({
            itemId: row.item_id,
            amc: row.average_monthly_consumption,
            name: row.name,
          })),
        };
      default:
        assertUnreachable(input);
    }
  },
  processor: input => {
    switch (input.t) {
      case 'Filter': {
        const filter: ChangelogFilter = {
          table_name: { equal_to: 'Invoice' },
        };

        return { t: 'Filter', v: filter };
      }
      case 'SkipOnError': {
        return { t: 'SkipOnError', v: true };
      }
      case 'Process': {
        log({ message: 'Example Plugins - Processing', changeLog: input.v });
        return { t: 'Process', v: 'success' };
      }
      default:
        assertUnreachable(input);
    }
  },
};

const getAggregatedAmc = (storeId: string, itemIds: string[]) => {
  return sqlQuery(
    ['item_id', 'average_monthly_consumption', 'name'],
    `
      WITH 
      rl_all AS (
      SELECT 
        rl.average_monthly_consumption,
        il.item_id,
        r.store_id,
        nl.name_id,
        n.name,
        r.created_datetime
      FROM requisition_line as rl
      JOIN item_link as il ON rl.item_link_id = il.id
      JOIN requisition as r ON rl.requisition_id = r.id
      JOIN name_link as nl ON r.name_link_id = nl.id
      JOIN name as n ON n.id = nl.name_id
      WHERE r.type = 'RESPONSE' 
      AND store_id = '${storeId}'
      AND il.item_id in ${sqlList(itemIds)}
      ),
      latest_created_datetime AS (
      SELECT
        item_id,
        name_id,
        max(created_datetime) as max_datetime
      FROM rl_all GROUP BY 1,2
      ),
      rl_latest AS (
      SELECT 
        average_monthly_consumption,
        rl_all.item_id,
        rl_all.name
      FROM rl_all
      INNER JOIN latest_created_datetime as latest ON 
        rl_all.item_id = latest.item_id AND
        rl_all.name_id = latest.name_id AND
        rl_all.created_datetime = latest.max_datetime 
      )
      SELECT item_id, average_monthly_consumption, name
      FROM rl_latest
    `
  );
};

function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}

export { plugins };
