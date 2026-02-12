use crate::backend_plugin::types::get_consumption;
use crate::common::days_in_a_month;
use crate::preference::{AdjustForNumberOfDaysOutOfStock, Preference};
use crate::{
    backend_plugin::{
        plugin_provider::{PluginInstance, PluginResult},
        types::amc,
    },
    service_provider::ServiceContext,
    store_preference::get_store_preferences,
    PluginOrRepositoryError,
};
use chrono::{Duration, NaiveDate};
use repository::{
    ConsumptionFilter, ConsumptionRepository, DateFilter, DaysOutOfStockFilter,
    DaysOutOfStockRepository, DaysOutOfStockRow, EqualFilter, PluginType, RepositoryError,
    RequisitionLine, StockOnHandFilter, StockOnHandRepository, StockOnHandRow, StorageConnection,
};
use std::{collections::HashMap, ops::Neg};
use util::{date_now, date_with_offset};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct ItemStats {
    pub total_consumption: f64,
    pub average_monthly_consumption: f64,
    pub available_stock_on_hand: f64,
    pub total_stock_on_hand: f64,
    pub item_id: String,
    pub item_name: String,
}

pub trait ItemStatsServiceTrait: Sync + Send {
    fn get_item_stats(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        amc_lookback_months: Option<f64>,
        item_ids: Vec<String>,
        period_end: Option<NaiveDate>,
    ) -> Result<Vec<ItemStats>, PluginOrRepositoryError> {
        get_item_stats(
            &ctx.connection,
            store_id,
            amc_lookback_months,
            item_ids,
            period_end,
        )
    }
}

pub struct ItemStatsService {}
impl ItemStatsServiceTrait for ItemStatsService {}

pub fn get_item_stats(
    connection: &StorageConnection,
    store_id: &str,
    amc_lookback_months: Option<f64>,
    item_ids: Vec<String>,
    period_end: Option<NaiveDate>,
) -> Result<Vec<ItemStats>, PluginOrRepositoryError> {
    let default_amc_lookback_months =
        get_store_preferences(connection, store_id)?.monthly_consumption_look_back_period;
    let amc_lookback_months = match amc_lookback_months {
        Some(months) => months,
        None => default_amc_lookback_months,
    };
    let days_in_month: f64 = days_in_a_month(connection);
    let number_of_days = amc_lookback_months * days_in_month;
    let end_date = period_end.unwrap_or_else(date_now);
    let offset_end_date = end_date + Duration::days(1);
    let start_date = date_with_offset(
        &offset_end_date,
        Duration::days((number_of_days).neg() as i64),
    );

    let consumption_filter = ConsumptionFilter {
        item_id: Some(EqualFilter::equal_any(item_ids.clone())),
        store_id: Some(EqualFilter::equal_to(store_id.to_string())),
        date: Some(DateFilter::date_range(&start_date, &end_date)),
        ..Default::default()
    };

    let consumption = get_consumption::Input {
        store_id: store_id.to_string(),
        item_ids: item_ids.clone(),
        start_date: start_date.to_string(),
        end_date: end_date.to_string(),
    };

    let consumption_map = match PluginInstance::get_one(PluginType::GetConsumption) {
        Some(plugin) => get_consumption::Trait::call(&(*plugin), consumption)?,
        None => get_consumption_map(connection, consumption_filter)?,
    };

    let adjust_for_days_out_of_stock = AdjustForNumberOfDaysOutOfStock
        .load(connection, None)
        .unwrap_or(false);

    let dos_filter = DaysOutOfStockFilter {
        item_id: Some(EqualFilter::equal_any(item_ids.clone())),
        store_id: Some(EqualFilter::equal_to(store_id.to_string())),
        from: start_date,
        to: end_date,
    };

    let adjusted_days_out_of_stock_map = if adjust_for_days_out_of_stock {
        let dos_rows = DaysOutOfStockRepository::new(connection).query(dos_filter)?;

        Some(get_days_out_of_stock_adjustment_map(
            dos_rows,
            number_of_days,
        )?)
    } else {
        None
    };

    let input = amc::Input {
        store_id: store_id.to_string(),
        amc_lookback_months,
        // Really don't like cloning this
        consumption_map: consumption_map.clone(),
        adjusted_days_out_of_stock_map,
        item_ids: item_ids.clone(),
    };

    let amc_by_item = match PluginInstance::get_one(PluginType::AverageMonthlyConsumption) {
        Some(plugin) => amc::Trait::call(&(*plugin), input),
        None => amc::Trait::call(&DefaultAmc, input),
    }?;

    Ok(ItemStats::new_vec(
        amc_by_item,
        consumption_map,
        get_stock_on_hand_rows(connection, store_id, Some(item_ids))?,
    ))
}

pub fn get_item_stats_map(
    connection: &StorageConnection,
    store_id: &str,
    amc_lookback_months: Option<f64>,
    item_ids: Vec<String>,
    period_end: Option<NaiveDate>,
) -> Result<HashMap<String, ItemStats>, PluginOrRepositoryError> {
    let item_stats_vec = get_item_stats(
        connection,
        store_id,
        amc_lookback_months,
        item_ids,
        period_end,
    );

    let item_stats_map = item_stats_vec?
        .into_iter()
        .map(|item_stats_entry| (item_stats_entry.item_id.clone(), item_stats_entry))
        .collect();

    Ok(item_stats_map)
}

struct DefaultAmc;
impl amc::Trait for DefaultAmc {
    fn call(
        &self,
        amc::Input {
            amc_lookback_months,
            consumption_map,
            adjusted_days_out_of_stock_map,
            ..
        }: amc::Input,
    ) -> PluginResult<amc::Output> {
        Ok(consumption_map
            .into_iter()
            .map(|(item_id, total_consumption)| {
                let adjusted_days = adjusted_days_out_of_stock_map
                    .as_ref()
                    .and_then(|map| map.get(&item_id))
                    .copied()
                    .unwrap_or(1.0);

                let average_monthly_consumption =
                    total_consumption / amc_lookback_months * adjusted_days;

                (
                    item_id,
                    amc::AverageMonthlyConsumptionItem {
                        average_monthly_consumption: Some(average_monthly_consumption),
                    },
                )
            })
            .collect())
    }
}

fn get_consumption_map(
    connection: &StorageConnection,
    filter: ConsumptionFilter,
) -> Result<HashMap<String /* item_id */, f64 /* total consumption */>, RepositoryError> {
    let consumption_rows = ConsumptionRepository::new(connection).query(Some(filter))?;

    let mut consumption_map = HashMap::new();

    for consumption_row in consumption_rows.into_iter() {
        let item_total_consumption = consumption_map
            .entry(consumption_row.item_id.clone())
            .or_insert(0.0);
        *item_total_consumption += consumption_row.quantity;
    }

    Ok(consumption_map)
}

fn get_days_out_of_stock_adjustment_map(
    dos_rows: Vec<DaysOutOfStockRow>,
    number_of_days: f64,
) -> Result<
    HashMap<String /* item_id */, f64 /* (numberOfDays/(numberOfDays-dos)) */>,
    RepositoryError,
> {
    let mut days_out_of_stock_adjustment_map = HashMap::new();
    for dos_row in dos_rows.into_iter() {
        let adjusted_days = days_out_of_stock_adjustment_map
            .entry(dos_row.item_id.clone())
            .or_insert(0.0);
        *adjusted_days = number_of_days / (number_of_days - dos_row.total_dos);
    }
    Ok(days_out_of_stock_adjustment_map)
}

pub fn get_stock_on_hand_rows(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: Option<Vec<String>>,
) -> Result<Vec<StockOnHandRow>, RepositoryError> {
    let filter = StockOnHandFilter {
        item_id: item_ids.map(EqualFilter::equal_any),
        store_id: Some(EqualFilter::equal_to(store_id.to_string())),
    };

    StockOnHandRepository::new(connection).query(Some(filter))
}

impl ItemStats {
    fn new_vec(
        amc_by_item: amc::Output,
        consumption_map: HashMap<String /* item_id */, f64 /* total consumption */>,
        stock_on_hand_rows: Vec<StockOnHandRow>,
    ) -> Vec<Self> {
        stock_on_hand_rows
            .into_iter()
            .map(|stock_on_hand| ItemStats {
                available_stock_on_hand: stock_on_hand.available_stock_on_hand,
                item_id: stock_on_hand.item_id.clone(),
                item_name: stock_on_hand.item_name.clone(),
                average_monthly_consumption: amc_by_item
                    .get(&stock_on_hand.item_id)
                    .and_then(|r| r.average_monthly_consumption)
                    .unwrap_or_default(),
                total_consumption: consumption_map
                    .get(&stock_on_hand.item_id)
                    .copied()
                    .unwrap_or_default(),
                total_stock_on_hand: stock_on_hand.total_stock_on_hand,
            })
            .collect()
    }

    pub fn from_requisition_line(requisition_line: &RequisitionLine) -> Self {
        let row = &requisition_line.requisition_line_row;
        ItemStats {
            average_monthly_consumption: row.average_monthly_consumption,
            available_stock_on_hand: row.available_stock_on_hand,
            item_id: requisition_line.item_row.id.clone(),
            item_name: requisition_line.item_row.name.clone(),
            // TODO: Implement total consumption & total_stock_on_hand
            total_consumption: 0.0,
            total_stock_on_hand: 0.0,
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_item_a, mock_store_a, mock_store_b, test_item_stats, MockData, MockDataInserts,
        },
        test_db, PreferenceRow, PreferenceRowRepository, StockLineRow, StorePreferenceRow,
        StorePreferenceRowRepository,
    };

    use crate::{
        preference::{AdjustForNumberOfDaysOutOfStock, DaysInMonth, Preference},
        service_provider::ServiceProvider,
    };

    use repository::mock::test_helpers::make_movements;

    pub(crate) fn mock_data() -> MockData {
        let test_stock_line = StockLineRow {
            id: "test_stock_line".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        // Use make_movements to create days where the item is out of stock
        let mock_data = MockData {
            stock_lines: vec![test_stock_line.clone()],
            ..Default::default()
        }
        .join(make_movements(
            test_stock_line.clone(),
            vec![
                (1, 3),
                (5, -3),
                (16, 3),
                (22, -3),
                (28, 3),
                /*
                Making sure to allow for local/utc timezone differences, at least +1 day at start and -1 day at end
                +------------------------+----+-----+------------+----+----+-------------+----+-----+-------------+----+
                |                        | 5  | 6   | ..(9 days) | 16 | 17 | .. (5 days) | 22 | 23  | .. (4 days) | 28 |
                +------------------------+----+-----+------------+----+----+-------------+----+-----+-------------+----+
                | end of day balance     | 0  | 0   | 0          | 3  | 3  | 3           | 0  | 0   | 0           | 3  |
                +------------------------+----+-----+------------+----+----+-------------+----+-----+-------------+----+
                | full day without stock | no | yes | yes * 9    | no | no | no          | no | yes | yes * 4     | no |
                +------------------------+----+-----+------------+----+----+-------------+----+-----+-------------+----+
                Leading to 15 dos
                https://www.tablesgenerator.com/text_tables (file -> paste table data)
                */
            ],
        ));

        mock_data
    }

    #[actix_rt::test]
    async fn test_item_stats_service() {
        let (_, _, connection_manager, _) = test_db::setup_all_with_data(
            "test_item_stats_service",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_stats_service;

        let item_ids = vec![test_item_stats::item().id, test_item_stats::item2().id];

        let mut item_stats = service
            .get_item_stats(&context, &mock_store_a().id, None, item_ids.clone(), None)
            .unwrap();
        item_stats.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(item_stats.len(), 2);
        assert_eq!(
            item_stats[0].available_stock_on_hand,
            test_item_stats::item_1_soh()
        );
        assert_eq!(
            item_stats[1].available_stock_on_hand,
            test_item_stats::item_2_soh()
        );

        assert_eq!(
            item_stats[0].average_monthly_consumption,
            test_item_stats::item1_amc_3_months()
        );
        assert_eq!(
            item_stats[1].average_monthly_consumption,
            test_item_stats::item2_amc_3_months()
        );

        // Reduce to looking back 1 month
        let mut item_stats = service
            .get_item_stats(
                &context,
                &mock_store_a().id,
                Some(1.0),
                item_ids.clone(),
                None,
            )
            .unwrap();
        item_stats.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(item_stats.len(), 2);
        assert_eq!(
            item_stats[0].available_stock_on_hand,
            test_item_stats::item_1_soh()
        );
        assert_eq!(
            item_stats[1].available_stock_on_hand,
            test_item_stats::item_2_soh()
        );

        assert_eq!(
            item_stats[0].average_monthly_consumption,
            test_item_stats::item1_amc_1_months()
        );

        // Reduce to looking back 1 month through store pref
        StorePreferenceRowRepository::new(&context.connection)
            .upsert_one(&StorePreferenceRow {
                id: mock_store_a().id.clone(),
                monthly_consumption_look_back_period: 1.0,
                ..Default::default()
            })
            .unwrap();
        let mut item_stats = service
            .get_item_stats(&context, &mock_store_a().id, None, item_ids.clone(), None)
            .unwrap();
        item_stats.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(item_stats.len(), 2);
        assert_eq!(
            item_stats[0].available_stock_on_hand,
            test_item_stats::item_1_soh()
        );
        assert_eq!(
            item_stats[1].available_stock_on_hand,
            test_item_stats::item_2_soh()
        );

        assert_eq!(
            item_stats[0].average_monthly_consumption,
            test_item_stats::item1_amc_1_months()
        );

        // No invoice lines check
        // Also confirms transfer line is not included
        assert_eq!(item_stats[1].average_monthly_consumption, 0.0);

        let mut item_stats = service
            .get_item_stats(&context, &mock_store_b().id, None, item_ids.clone(), None)
            .unwrap();
        item_stats.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(item_stats.len(), 2);
        assert_eq!(
            item_stats[0].available_stock_on_hand,
            test_item_stats::item_1_store_b_soh()
        );
        // No stock line check
        assert_eq!(item_stats[1].available_stock_on_hand, 0.0);

        assert_eq!(
            item_stats[0].average_monthly_consumption,
            test_item_stats::item1_amc_3_months_store_b()
        );

        // Change days in a month to 32 via Global pref
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "days in month".to_string(),
                store_id: None,
                key: DaysInMonth.key().to_string(),
                value: "32".to_string(),
            })
            .unwrap();

        let pref = PreferenceRowRepository::new(&context.connection)
            .find_one_by_key(&DaysInMonth.key().to_string())
            .unwrap()
            .unwrap();
        assert_eq!(pref.value, "32");

        let mut item_stats = service
            .get_item_stats(&context, &mock_store_a().id, None, item_ids.clone(), None)
            .unwrap();
        item_stats.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(
            item_stats[0].average_monthly_consumption,
            test_item_stats::item1_amc_number_of_days_pref()
        );

        assert_eq!(
            item_stats[1].average_monthly_consumption,
            test_item_stats::item2_amc_number_of_days_pref()
        );

        // Set days pref to 0.0 => will default back to average days in month
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "days in month".to_string(),
                store_id: None,
                key: DaysInMonth.key().to_string(),
                value: "0.0".to_string(),
            })
            .unwrap();

        // Test with a period end date (from requisition)
        let period_end = Some(test_item_stats::period_end_date());
        let mut item_stats = service
            .get_item_stats(
                &context,
                &mock_store_a().id,
                None,
                item_ids.clone(),
                period_end,
            )
            .unwrap();
        item_stats.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(item_stats.len(), 2);

        assert_eq!(
            item_stats[0].average_monthly_consumption,
            test_item_stats::item1_amc_1_months_period_end_date()
        );
        assert_eq!(
            item_stats[1].average_monthly_consumption,
            test_item_stats::item2_amc_1_months_period_end_date()
        );
    }

    #[actix_rt::test]
    async fn test_item_stats_with_dos() {
        let (_, _, connection_manager, _) = test_db::setup_all_with_data(
            "test_item_stats_with_dos",
            MockDataInserts::none().names().stores().units().items(),
            mock_data(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_stats_service;

        let item_ids = vec![mock_item_a().id.clone()];
        let item_stats = service
            .get_item_stats(
                &context,
                &mock_store_a().id,
                Some(1.0),
                item_ids.clone(),
                None,
            )
            .unwrap();

        // Set days pref to 30.0 for simpler testing
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "days in month".to_string(),
                store_id: None,
                key: DaysInMonth.key().to_string(),
                value: "30.0".to_string(),
            })
            .unwrap();

        // AMC with DOS preference off
        assert_eq!(item_stats[0].average_monthly_consumption, 6.0);

        // Turn adjust for days out of stock preference on
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "adjust dos".to_string(),
                store_id: None,
                key: AdjustForNumberOfDaysOutOfStock.key().to_string(),
                value: "true".to_string(),
            })
            .unwrap();

        let item_stats = service
            .get_item_stats(&context, &mock_store_a().id, Some(1.0), item_ids, None)
            .unwrap();

        // With DOS adjustment: 30 days / (30 - 15 dos) = 30/15 = 2
        // AMC = 6.0 * 2 = 12
        assert_eq!(item_stats[0].average_monthly_consumption, 12.0);
    }
}
