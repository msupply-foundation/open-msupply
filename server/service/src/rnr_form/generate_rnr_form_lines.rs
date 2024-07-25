use std::{collections::HashMap, ops::Neg};

use chrono::{Duration, NaiveDate, NaiveDateTime};
use repository::{
    AdjustmentFilter, AdjustmentRepository, ConsumptionFilter, ConsumptionRepository, DateFilter,
    EqualFilter, MasterListLineFilter, MasterListLineRepository, PeriodRow, ReplenishmentFilter,
    ReplenishmentRepository, RepositoryError, RnRForm, RnRFormLineRow, RnRFormLineRowRepository,
    StorageConnection,
};
use util::{constants::NUMBER_OF_DAYS_IN_A_MONTH, date_now, date_with_offset, uuid::uuid};

use crate::{
    requisition_line::chart::{get_stock_evolution_for_item, StockEvolutionOptions},
    service_provider::ServiceContext,
};

// Would be nice if this was an OMS store pref
const TARGET_MOS: f64 = 2.0;

pub fn generate_rnr_form_lines(
    ctx: &ServiceContext,
    store_id: &str,
    rnr_form_id: &str,
    master_list_id: &str,
    period: PeriodRow,
    previous_form: Option<RnRForm>,
) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
    let master_list_item_ids = get_master_list_item_ids(&ctx, master_list_id)?;

    let period_length_in_days = get_period_length(&period);
    // TODO: maybe sep amc calc
    // let lookback_months = period_length_in_days as f64 / NUMBER_OF_DAYS_IN_A_MONTH;
    let lookback_months = period_length_in_days as f64 / 31.0; // tehe

    // Get consumption/replenishment/adjustment stats for each item in the master list
    let usage_by_item_map = get_usage_map(
        &ctx.connection,
        store_id,
        Some(EqualFilter::equal_any(master_list_item_ids.clone())),
        period_length_in_days,
        &period.end_date,
    )?;

    // Get previous form data for intial balance
    let previous_rnr_form_lines_by_item_id =
        get_last_rnr_form_lines(&ctx.connection, previous_form.map(|f| f.rnr_form_row.id))?;

    let rnr_form_lines = master_list_item_ids
        .into_iter()
        .map(|item_id| {
            let initial_balance = previous_rnr_form_lines_by_item_id
                .get(&item_id)
                .map(|line| line.final_balance)
                .unwrap_or(get_opening_balance());

            let usage = usage_by_item_map.get(&item_id).copied().unwrap_or_default();

            let final_balance =
                initial_balance + usage.replenished - usage.consumed + usage.adjusted;

            let stock_out_duration = get_stock_out_duration(
                &ctx.connection,
                store_id,
                &item_id,
                // TODO: where in datetime?
                period.end_date.into(),
                period_length_in_days as u32,
                final_balance,
            )?;

            let days_in_stock = period_length_in_days - stock_out_duration as i64;

            let adjusted_quantity_consumed = match days_in_stock {
                0 => 0.0,
                days_in_stock => {
                    usage.consumed * period_length_in_days as f64 / days_in_stock as f64
                }
            };

            // that's not amc, that's this period... should it be something else?
            let amc = usage.consumed / lookback_months;

            let maximum_quantity = amc * TARGET_MOS;

            Ok(RnRFormLineRow {
                id: uuid(),
                rnr_form_id: rnr_form_id.to_string(),
                item_id,
                average_monthly_consumption: amc,
                initial_balance,
                quantity_received: usage.replenished,
                quantity_consumed: usage.consumed,
                stock_out_duration,
                adjustments: usage.adjusted,

                adjusted_quantity_consumed,
                final_balance,
                maximum_quantity,
                // stock lines for item, find earliest expiry or blank
                expiry_date: None,
                // OR ZERO
                requested_quantity: maximum_quantity - final_balance,
                comment: None,
                confirmed: false,
            })
        })
        .collect::<Result<Vec<RnRFormLineRow>, RepositoryError>>();

    rnr_form_lines
}

fn get_master_list_item_ids(
    ctx: &ServiceContext,
    master_list_id: &str,
) -> Result<Vec<String>, RepositoryError> {
    MasterListLineRepository::new(&ctx.connection)
        .query_by_filter(
            MasterListLineFilter::new().master_list_id(EqualFilter::equal_to(master_list_id)),
        )
        .map(|lines| lines.into_iter().map(|line| line.item_id).collect())
}

// TODO: test this rip
fn get_last_rnr_form_lines(
    connection: &StorageConnection,
    previous_form_id: Option<String>,
) -> Result<HashMap<String, RnRFormLineRow>, RepositoryError> {
    let mut form_lines_by_item_id = HashMap::new();

    if let Some(previous_form_id) = previous_form_id {
        let rows = RnRFormLineRowRepository::new(connection)
            .find_many_by_rnr_form_id(&previous_form_id)?;

        for row in rows.into_iter() {
            form_lines_by_item_id.insert(row.item_id.clone(), row);
        }
    }

    Ok(form_lines_by_item_id)
}

fn get_opening_balance() -> f64 {
    // get current SOH, subtract all movements until date... could be v expenny!!
    // shooould only be on first one.
    2.0
}

fn get_stock_out_duration(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
    end_datetime: NaiveDateTime,
    days_in_period: u32,
    closing_quantity: f64,
) -> Result<i32, RepositoryError> {
    let evolution = get_stock_evolution_for_item(
        connection,
        store_id,
        item_id,
        end_datetime,
        closing_quantity as u32,
        // These 3 values are actually only used for future projections, so we don't care about them
        date_now(),
        0,
        0.0,
        StockEvolutionOptions {
            number_of_historic_data_points: days_in_period,
            number_of_projected_data_points: 0,
        },
    )?;

    let days_out_of_stock = evolution
        .historic_stock
        .into_iter()
        .filter(|point| point.quantity == 0.0)
        .count();

    Ok(days_out_of_stock as i32)
}

#[derive(Debug, PartialEq, Default, Copy, Clone)]
pub struct UsageStats {
    pub consumed: f64,
    pub replenished: f64,
    pub adjusted: f64,
}

pub fn get_usage_map(
    connection: &StorageConnection,
    store_id: &str,
    item_id_filter: Option<EqualFilter<String>>,
    lookback_days: i64,
    end_date: &NaiveDate,
) -> Result<HashMap<String, UsageStats>, RepositoryError> {
    let start_date = date_with_offset(end_date, Duration::days(lookback_days).neg());
    let store_id_filter = Some(EqualFilter::equal_to(store_id));
    let date_filter = Some(DateFilter::date_range(&start_date, end_date));

    let consumption_rows =
        ConsumptionRepository::new(connection).query(Some(ConsumptionFilter {
            item_id: item_id_filter.clone(),
            store_id: store_id_filter.clone(),
            date: date_filter.clone(),
        }))?;
    let replenishment_rows =
        ReplenishmentRepository::new(connection).query(Some(ReplenishmentFilter {
            item_id: item_id_filter.clone(),
            store_id: store_id_filter.clone(),
            date: date_filter.clone(),
        }))?;
    let adjustment_rows = AdjustmentRepository::new(connection).query(Some(AdjustmentFilter {
        item_id: item_id_filter,
        store_id: store_id_filter,
        date: date_filter,
    }))?;

    let mut usage_map = HashMap::new();

    for consumption_row in consumption_rows.into_iter() {
        let item = usage_map
            .entry(consumption_row.item_id.clone())
            .or_insert(UsageStats::default());
        item.consumed += consumption_row.quantity;
    }
    for replenishment_row in replenishment_rows.into_iter() {
        let item = usage_map
            .entry(replenishment_row.item_id.clone())
            .or_insert(UsageStats::default());
        item.replenished += replenishment_row.quantity;
    }
    for adjustment_row in adjustment_rows.into_iter() {
        let item = usage_map
            .entry(adjustment_row.item_id.clone())
            .or_insert(UsageStats::default());
        item.adjusted += adjustment_row.quantity;
    }

    Ok(usage_map)
}

fn get_period_length(period: &PeriodRow) -> i64 {
    period
        .end_date
        .signed_duration_since(period.start_date)
        .num_days()
}
