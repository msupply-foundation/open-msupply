use std::{collections::HashMap, ops::Neg};

use crate::{
    backend_plugin::{
        plugin_provider::{PluginInstance, PluginResult, PluginType},
        types::amc,
    },
    service_provider::ServiceContext,
    PluginOrRepositoryError,
};
use chrono::Duration;
use repository::{
    ConsumptionFilter, ConsumptionRepository, DateFilter, EqualFilter, RepositoryError,
    RequisitionLine, StockOnHandFilter, StockOnHandRepository, StockOnHandRow, StorageConnection,
    StorePreferenceRowRepository,
};
use util::{
    constants::{DEFAULT_AMC_LOOKBACK_MONTHS, NUMBER_OF_DAYS_IN_A_MONTH},
    date_now_with_offset,
};

#[derive(Clone, Debug, PartialEq)]
pub struct ItemStats {
    pub total_consumption: f64,
    pub average_monthly_consumption: f64,
    pub available_stock_on_hand: f64,
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
    ) -> Result<Vec<ItemStats>, PluginOrRepositoryError> {
        get_item_stats(ctx, store_id, amc_lookback_months, item_ids)
    }
}

pub struct ItemStatsService {}
impl ItemStatsServiceTrait for ItemStatsService {}

pub fn get_item_stats(
    ctx: &ServiceContext,
    store_id: &str,
    amc_lookback_months: Option<f64>,
    item_ids: Vec<String>,
) -> Result<Vec<ItemStats>, PluginOrRepositoryError> {
    let default_amc_lookback_months = StorePreferenceRowRepository::new(&ctx.connection)
        .find_one_by_id(store_id)?
        .map_or(DEFAULT_AMC_LOOKBACK_MONTHS.into(), |row| {
            if row.monthly_consumption_look_back_period == 0.0 {
                DEFAULT_AMC_LOOKBACK_MONTHS.into()
            } else {
                row.monthly_consumption_look_back_period
            }
        });

    let amc_lookback_months = match amc_lookback_months {
        Some(months) => months,
        None => default_amc_lookback_months,
    };

    let consumption_map = get_consumption_map(
        &ctx.connection,
        store_id,
        item_ids.clone(),
        amc_lookback_months,
    )?;

    let input = amc::Input {
        store_id: store_id.to_string(),
        amc_lookback_months,
        // Really don't like cloning this
        consumption_map: consumption_map.clone(),
        item_ids: item_ids.clone(),
    };

    let amc_by_item = match PluginInstance::get_one(PluginType::Amc) {
        Some(plugin) => amc::Trait::call(&(*plugin), input),
        None => amc::Trait::call(&DefaultAmc, input),
    }?;

    Ok(ItemStats::new_vec(
        amc_by_item,
        consumption_map,
        get_stock_on_hand_rows(&ctx.connection, store_id, Some(item_ids))?,
    ))
}

struct DefaultAmc;
impl amc::Trait for DefaultAmc {
    fn call(
        &self,
        amc::Input {
            amc_lookback_months,
            consumption_map,
            ..
        }: amc::Input,
    ) -> PluginResult<amc::Output> {
        Ok(consumption_map
            .iter()
            .map(|(item_id, consumption)| {
                (
                    item_id.to_string(),
                    amc::AverageMonthlyConsumptionItem {
                        average_monthly_consumption: Some(*consumption / amc_lookback_months),
                    },
                )
            })
            .collect())
    }
}

fn get_consumption_map(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: Vec<String>,
    amc_lookback_months: f64,
) -> Result<HashMap<String /* item_id */, f64 /* total consumption */>, RepositoryError> {
    let start_date = date_now_with_offset(Duration::days(
        (amc_lookback_months * NUMBER_OF_DAYS_IN_A_MONTH).neg() as i64,
    ));

    let filter = ConsumptionFilter {
        item_id: Some(EqualFilter::equal_any(item_ids)),
        store_id: Some(EqualFilter::equal_to(store_id)),
        date: Some(DateFilter::after_or_equal_to(start_date)),
    };

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

pub fn get_stock_on_hand_rows(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: Option<Vec<String>>,
) -> Result<Vec<StockOnHandRow>, RepositoryError> {
    let filter = StockOnHandFilter {
        item_id: item_ids.map(|ids| EqualFilter::equal_any(ids)),
        store_id: Some(EqualFilter::equal_to(store_id)),
    };

    StockOnHandRepository::new(connection).query(Some(filter))
}

impl ItemStats {
    fn new_vec(
        amc_by_item: amc::Output,
        consumption_map: HashMap<String /* item_id */, f64 /* consumption */>,
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
                    .map(|r| r.average_monthly_consumption)
                    .flatten()
                    .unwrap_or_default(),
                total_consumption: consumption_map
                    .get(&stock_on_hand.item_id)
                    .copied()
                    .unwrap_or_default(),
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
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_store_a, mock_store_b, test_item_stats, MockDataInserts},
        test_db, StorePreferenceRow, StorePreferenceRowRepository,
    };

    use crate::service_provider::ServiceProvider;

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
            .get_item_stats(&context, &mock_store_a().id, None, item_ids.clone())
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
            .get_item_stats(&context, &mock_store_a().id, Some(1.0), item_ids.clone())
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
            .get_item_stats(&context, &mock_store_a().id, None, item_ids.clone())
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
        assert_eq!(item_stats[1].average_monthly_consumption, 0.0);

        let mut item_stats = service
            .get_item_stats(&context, &mock_store_b().id, None, item_ids.clone())
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
    }
}
