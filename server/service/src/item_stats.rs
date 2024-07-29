use std::{collections::HashMap, ops::Neg};

use crate::service_provider::ServiceContext;
use chrono::{Datelike, Duration, Utc};
use repository::{
    ConsumptionFilter, ConsumptionRepository, ConsumptionRow, DateFilter, EqualFilter,
    RepositoryError, RequisitionLine, StockLineFilter, StockLineRepository, StockOnHandFilter,
    StockOnHandRepository, StockOnHandRow, StorageConnection, StorePreferenceRowRepository,
};
use util::{
    constants::{DEFAULT_AMC_LOOKBACK_MONTHS, NUMBER_OF_DAYS_IN_A_MONTH},
    date_now_with_offset,
};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct ItemStatsFilter {
    pub item_id: Option<EqualFilter<String>>,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ItemStats {
    pub this_month_consumption: Option<f64>,
    pub last_month_consumption: Option<f64>,
    pub last_three_months_consumption: Option<f64>,
    pub expiring_in_six_months: Option<i64>,
    pub expiring_in_a_year: Option<i64>,
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
        filter: Option<ItemStatsFilter>,
    ) -> Result<Vec<ItemStats>, RepositoryError> {
        get_item_stats(ctx, store_id, amc_lookback_months, filter)
    }
}

pub struct ItemStatsService {}
impl ItemStatsServiceTrait for ItemStatsService {}

pub fn get_item_stats(
    ctx: &ServiceContext,
    store_id: &str,
    amc_lookback_months: Option<f64>,
    filter: Option<ItemStatsFilter>,
) -> Result<Vec<ItemStats>, RepositoryError> {
    let ItemStatsFilter {
        item_id: item_id_filter,
    } = filter.unwrap_or_default();

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

    let consumption_rows = get_consumption_rows(
        &ctx.connection,
        store_id,
        item_id_filter.clone(),
        amc_lookback_months,
    )?;

    Ok(ItemStats::new_vec(
        consumption_rows.clone(),
        get_stock_on_hand_rows(&ctx.connection, store_id, item_id_filter.clone())?,
        amc_lookback_months,
        get_expiring_lines_count(&ctx.connection, store_id, item_id_filter)?,
    ))
}

pub fn get_consumption_rows(
    connection: &StorageConnection,
    store_id: &str,
    item_id_filter: Option<EqualFilter<String>>,
    amc_lookback_months: f64,
) -> Result<Vec<ConsumptionRow>, RepositoryError> {
    let start_date = date_now_with_offset(Duration::days(
        (amc_lookback_months * NUMBER_OF_DAYS_IN_A_MONTH).neg() as i64,
    ));

    let filter = ConsumptionFilter {
        item_id: item_id_filter,
        store_id: Some(EqualFilter::equal_to(store_id)),
        date: Some(DateFilter::after_or_equal_to(start_date)),
    };

    ConsumptionRepository::new(connection).query(Some(filter))
}

pub fn get_stock_on_hand_rows(
    connection: &StorageConnection,
    store_id: &str,
    item_id_filter: Option<EqualFilter<String>>,
) -> Result<Vec<StockOnHandRow>, RepositoryError> {
    let filter = StockOnHandFilter {
        item_id: item_id_filter,
        store_id: Some(EqualFilter::equal_to(store_id)),
    };

    StockOnHandRepository::new(connection).query(Some(filter))
}

pub fn get_expiring_lines_count(
    connection: &StorageConnection,
    store_id: &str,
    item_id_filter: Option<EqualFilter<String>>,
) -> Result<HashMap<String, (i64, i64)>, RepositoryError> {
    let current_date = Utc::now().date_naive();
    let six_months_from_now = current_date + Duration::days(180);
    let a_year_from_now = current_date + Duration::days(365);

    let repo = StockLineRepository::new(connection);

    let filter = StockLineFilter {
        store_id: Some(EqualFilter::equal_to(store_id)),
        item_id: item_id_filter,
        is_available: Some(true),
        ..Default::default()
    };

    let expiring_in_six_months = repo.query_by_filter(
        filter.clone().expiry_date(DateFilter {
            before_or_equal_to: Some(six_months_from_now),
            after_or_equal_to: Some(current_date),
            equal_to: None,
        }),
        None,
    )?;

    let expiring_in_a_year = repo.query_by_filter(
        filter.expiry_date(DateFilter {
            before_or_equal_to: Some(a_year_from_now),
            after_or_equal_to: Some(current_date),
            equal_to: None,
        }),
        None,
    )?;

    let mut expiring_count = HashMap::new();

    for stock_line in expiring_in_six_months {
        let count = expiring_count
            .entry(stock_line.item_row.id.clone())
            .or_insert((0, 0));
        count.0 += 1
    }

    for stock_line in expiring_in_a_year {
        let count = expiring_count
            .entry(stock_line.item_row.id.clone())
            .or_insert((0, 0));
        count.1 += 1
    }

    Ok(expiring_count)
}

impl ItemStats {
    fn new_vec(
        consumption_rows: Vec<ConsumptionRow>,
        stock_on_hand_rows: Vec<StockOnHandRow>,
        amc_lookback_months: f64,
        expiring_count: HashMap<String, (i64, i64)>,
    ) -> Vec<Self> {
        let mut consumption_map = HashMap::new();
        for consumption_row in consumption_rows.clone().into_iter() {
            let item_total_consumption = consumption_map
                .entry(consumption_row.item_id.clone())
                .or_insert(0.0);
            *item_total_consumption += consumption_row.quantity;
        }

        let current_date = Utc::now();
        let this_month = current_date.with_day(1).unwrap().date_naive();
        let last_month = (current_date - Duration::days(30))
            .with_day(1)
            .unwrap()
            .date_naive();
        let three_months_ago = (current_date - Duration::days(90)).date_naive();

        stock_on_hand_rows
            .into_iter()
            .map(|stock_on_hand| ItemStats {
                available_stock_on_hand: stock_on_hand.available_stock_on_hand,
                item_id: stock_on_hand.item_id.clone(),
                item_name: stock_on_hand.item_name.clone(),
                average_monthly_consumption: consumption_map
                    .get(&stock_on_hand.item_id)
                    .map(|consumption| *consumption / amc_lookback_months)
                    .unwrap_or_default(),
                total_consumption: consumption_map
                    .get(&stock_on_hand.item_id)
                    .copied()
                    .unwrap_or_default(),
                this_month_consumption: Some(
                    consumption_rows
                        .iter()
                        .filter(|row| {
                            row.item_id == stock_on_hand.item_id && row.date >= this_month
                        })
                        .map(|row| row.quantity)
                        .sum(),
                ),
                last_month_consumption: Some(
                    consumption_rows
                        .iter()
                        .filter(|row| {
                            row.item_id == stock_on_hand.item_id
                                && row.date >= last_month
                                && row.date < this_month
                        })
                        .map(|row| row.quantity)
                        .sum(),
                ),
                last_three_months_consumption: Some(
                    consumption_rows
                        .iter()
                        .filter(|row| {
                            row.item_id == stock_on_hand.item_id && row.date >= three_months_ago
                        })
                        .map(|row| row.quantity)
                        .sum(),
                ),
                expiring_in_six_months: expiring_count
                    .get(&stock_on_hand.item_id)
                    .map(|(six_months, _)| *six_months),
                expiring_in_a_year: expiring_count
                    .get(&stock_on_hand.item_id)
                    .map(|(_, a_year)| *a_year),
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
            // TODO: Implement total consumption
            total_consumption: 0.0,
            this_month_consumption: None,
            last_month_consumption: None,
            last_three_months_consumption: None,
            expiring_in_six_months: None,
            expiring_in_a_year: None,
        }
    }
}

impl ItemStatsFilter {
    pub fn new() -> ItemStatsFilter {
        ItemStatsFilter { item_id: None }
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }
}
#[cfg(test)]
mod test {
    use repository::{
        mock::{mock_store_a, mock_store_b, test_item_stats, MockDataInserts},
        test_db, EqualFilter, StorePreferenceRow, StorePreferenceRowRepository,
    };

    use crate::{item_stats::ItemStatsFilter, service_provider::ServiceProvider};

    #[actix_rt::test]
    async fn test_item_stats_service() {
        let (_, _, connection_manager, _) = test_db::setup_all_with_data(
            "test_item_stats_service",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.item_stats_service;

        let item_ids = vec![test_item_stats::item().id, test_item_stats::item2().id];
        let filter = Some(ItemStatsFilter::new().item_id(EqualFilter::equal_any(item_ids)));

        let mut item_stats = service
            .get_item_stats(&context, &mock_store_a().id, None, filter.clone())
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
            .get_item_stats(&context, &mock_store_a().id, Some(1.0), filter.clone())
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
            .get_item_stats(&context, &mock_store_a().id, None, filter.clone())
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
            .get_item_stats(&context, &mock_store_b().id, None, filter.clone())
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
