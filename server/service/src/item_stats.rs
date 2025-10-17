use std::{collections::HashMap, ops::Neg};

use crate::common::days_in_a_month;
use crate::preference::{ExcludeTransfers, Preference};
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
    ConsumptionFilter, ConsumptionRepository, ConsumptionRow, DateFilter, EqualFilter, PluginType,
    RepositoryError, RequisitionLine, StockOnHandFilter, StockOnHandRepository, StockOnHandRow,
    StorageConnection,
};
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

    let filter: ConsumptionFilter =
        create_amc_filter(store_id, number_of_days, &item_ids, period_end)?;

    fn create_amc_filter(
        store_id: &str,
        number_of_days: f64,
        item_ids: &Vec<String>,
        period_end: Option<NaiveDate>,
    ) -> Result<ConsumptionFilter, PluginOrRepositoryError> {
        let end_date = period_end.unwrap_or_else(date_now);
        let offset_end_date = end_date + Duration::days(1);
        let start_date = date_with_offset(
            &offset_end_date,
            Duration::days((number_of_days).neg() as i64),
        );

        let filter = ConsumptionFilter {
            item_id: Some(EqualFilter::equal_any(item_ids.clone())),
            store_id: Some(EqualFilter::equal_to(store_id)),
            date: Some(DateFilter::date_range(&start_date, &end_date)),
        };

        Ok(filter)
    }

    let consumption_rows = ConsumptionRepository::new(connection).query(Some(filter))?;

    let consumption_map = get_consumption_map(&consumption_rows)?;
    let transfer_consumption_map = get_transfer_consumption_map(&consumption_rows)?;

    let exclude_transfers = ExcludeTransfers.load(connection, None).unwrap_or(false);

    let adjusted_consumption_map = match exclude_transfers {
        true => combine_maps(consumption_map.clone(), transfer_consumption_map),
        false => consumption_map.clone(),
    };

    let input = amc::Input {
        store_id: store_id.to_string(),
        amc_lookback_months,
        number_of_days,
        // Really don't like cloning this
        consumption_map: adjusted_consumption_map.clone(),
        item_ids: item_ids.clone(),
    };

    let amc_by_item = match PluginInstance::get_one(PluginType::AverageMonthlyConsumption) {
        Some(plugin) => amc::Trait::call(&(*plugin), input),
        None => amc::Trait::call(&DefaultAmc, input),
    }?;

    Ok(ItemStats::new_vec(
        amc_by_item,
        adjusted_consumption_map,
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

fn combine_maps(
    mut consumption_map: HashMap<String, f64>,
    transfer_consumption_map: HashMap<String, f64>,
) -> HashMap<String, f64> {
    for (item_id, transfer_consumption) in transfer_consumption_map {
        consumption_map
            .entry(item_id.clone())
            .and_modify(|total_consumption| *total_consumption -= transfer_consumption);
    }

    consumption_map
}

struct DefaultAmc;
impl amc::Trait for DefaultAmc {
    fn call(
        &self,
        amc::Input {
            amc_lookback_months,
            consumption_map,
            number_of_days,
            ..
        }: amc::Input,
    ) -> PluginResult<amc::Output> {
        Ok(consumption_map
            .iter()
            .map(|(item_id, total_consumption)| {
                // TODO: dos
                let dos = 0.0;

                let consumption_per_month = (*total_consumption) / amc_lookback_months;

                let timeframe = number_of_days / (number_of_days - dos);
                let average_monthly_consumption = consumption_per_month * timeframe;

                (
                    item_id.to_string(),
                    amc::AverageMonthlyConsumptionItem {
                        average_monthly_consumption: Some(average_monthly_consumption),
                    },
                )
            })
            .collect())
    }
}

fn get_consumption_map(
    consumption_rows: &Vec<ConsumptionRow>,
) -> Result<HashMap<String /* item_id */, f64 /* total consumption */>, RepositoryError> {
    let mut consumption_map = HashMap::new();
    for consumption_row in consumption_rows.into_iter() {
        let item_total_consumption = consumption_map
            .entry(consumption_row.item_id.clone())
            .or_insert(0.0);
        *item_total_consumption += consumption_row.quantity;
    }

    Ok(consumption_map)
}

fn get_transfer_consumption_map(
    consumption_rows: &Vec<ConsumptionRow>,
) -> Result<HashMap<String /* item_id */, f64 /* transfer consumption */>, RepositoryError> {
    let mut transfer_consumption_map = HashMap::new();
    for consumption_row in consumption_rows.into_iter() {
        if consumption_row.is_transfer == true {
            let item_transfer_consumption = transfer_consumption_map
                .entry(consumption_row.item_id.clone())
                .or_insert(0.0);
            *item_transfer_consumption += consumption_row.quantity;
        }
    }

    Ok(transfer_consumption_map)
}

pub fn get_stock_on_hand_rows(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: Option<Vec<String>>,
) -> Result<Vec<StockOnHandRow>, RepositoryError> {
    let filter = StockOnHandFilter {
        item_id: item_ids.map(EqualFilter::equal_any),
        store_id: Some(EqualFilter::equal_to(store_id)),
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
            .map(|stock_on_hand| {
                let total_consumption = consumption_map
                    .get(&stock_on_hand.item_id)
                    .cloned()
                    .unwrap_or(0.0);

                ItemStats {
                    available_stock_on_hand: stock_on_hand.available_stock_on_hand,
                    item_id: stock_on_hand.item_id.clone(),
                    item_name: stock_on_hand.item_name.clone(),
                    average_monthly_consumption: amc_by_item
                        .get(&stock_on_hand.item_id)
                        .and_then(|r| r.average_monthly_consumption)
                        .unwrap_or_default(),
                    total_consumption,
                    total_stock_on_hand: stock_on_hand.total_stock_on_hand,
                }
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
        mock::{mock_store_a, mock_store_b, test_item_stats, MockDataInserts},
        test_db, PreferenceRow, PreferenceRowRepository, StorePreferenceRow,
        StorePreferenceRowRepository,
    };

    use crate::{
        preference::{DaysInMonth, ExcludeTransfers, Preference},
        service_provider::ServiceProvider,
    };

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

        // Test 3 month stats with exclude_transfers = true
        // Exclude Transfer = true
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "exclude transfers".to_string(),
                store_id: None,
                key: ExcludeTransfers.key().to_string(),
                value: "true".to_string(),
            })
            .unwrap();

        let mut item_stats = service
            .get_item_stats(
                &context,
                &mock_store_a().id,
                Some(3.0),
                item_ids.clone(),
                None,
            )
            .unwrap();
        item_stats.sort_by(|a, b| a.item_id.cmp(&b.item_id));

        assert_eq!(
            item_stats[1].average_monthly_consumption,
            test_item_stats::item2_amc_3_months_excluding_transfer()
        );

        // Test remainder with exclude_transfers = false
        PreferenceRowRepository::new(&context.connection)
            .upsert_one(&PreferenceRow {
                id: "exclude transfers".to_string(),
                store_id: None,
                key: ExcludeTransfers.key().to_string(),
                value: "false".to_string(),
            })
            .unwrap();

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
}
