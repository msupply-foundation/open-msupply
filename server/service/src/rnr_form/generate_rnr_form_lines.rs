use std::collections::HashMap;

use chrono::{Datelike, NaiveDateTime};
use repository::{
    EqualFilter, MasterListLineFilter, MasterListLineRepository, PeriodRow, RepositoryError,
    RnRForm, RnRFormLineRow, RnRFormLineRowRepository, StorageConnection,
};
use util::{date_now, uuid::uuid};

use crate::{
    item_stats::{get_consumption_map, get_consumption_rows},
    requisition_line::chart::{get_stock_evolution_for_item, StockEvolutionOptions},
    service_provider::ServiceContext,
};

// Make this a store pref... in OMS?
const TARGET_MOS: i32 = 2;

pub fn generate_rnr_form_lines(
    ctx: &ServiceContext,
    store_id: &str,
    rnr_form_id: &str,
    master_list_id: &str,
    period: PeriodRow,
    previous_form: Option<RnRForm>,
) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
    let master_list_item_ids = get_master_list_item_ids(&ctx, master_list_id)?;

    let lookback_months = get_lookback_months(&period);
    let period_length_in_days = period
        .end_date
        .signed_duration_since(period.start_date)
        .num_days();

    let consumption_rows = get_consumption_rows(
        &ctx.connection,
        store_id,
        Some(EqualFilter::equal_any(master_list_item_ids.clone())),
        period_length_in_days,
        &period.end_date,
    )?;

    // let replenishment_rows = get_stock_on_hand_rows(
    //     &ctx.connection,
    //     store_id,
    //     Some(EqualFilter::equal_any(master_list_item_ids.clone())),
    // )?;

    // TODO: use historic consumption!!!
    let consumption_map = get_consumption_map(consumption_rows);

    let previous_rnr_form_lines_by_item_id =
        get_last_rnr_form_lines(&ctx.connection, previous_form.map(|f| f.rnr_form_row.id))?;

    let rnr_form_lines = master_list_item_ids
        .into_iter()
        .map(|item_id| {
            let initial_balance = previous_rnr_form_lines_by_item_id
                .get(&item_id)
                .map(|line| line.final_balance)
                .unwrap_or(get_opening_balance());

            let quantity_consumed = consumption_map.get(&item_id).copied().unwrap_or_default();

            // should be total incoming?
            let quantity_received = 0.0;
            let final_balance = 0.0;

            let stock_out_duration: i32 = get_stock_out_duration(
                &ctx.connection,
                store_id,
                &item_id,
                // where in datetime?
                period.end_date.into(),
                period_length_in_days,
                final_balance,
            )?;

            let days_in_stock = period_length_in_days - stock_out_duration as i64;

            let adjusted_quantity_consumed = match days_in_stock {
                0 => 0.0,
                days_in_stock => quantity_consumed * (period_length_in_days / days_in_stock) as f64,
            };

            let amc = quantity_consumed / lookback_months as f64;

            let maximum_quantity = amc * TARGET_MOS as f64;

            Ok(RnRFormLineRow {
                id: uuid(),
                rnr_form_id: rnr_form_id.to_string(),
                item_id,
                average_monthly_consumption: amc,
                initial_balance,
                quantity_received,
                quantity_consumed,
                stock_out_duration,
                // all adjustments (adjustments and returns over period)
                adjustments: 0.0,

                adjusted_quantity_consumed,
                // SOH on date
                final_balance,
                maximum_quantity,
                // stock lines for item, find earliest expiry or blank
                expiry_date: None,
                requested_quantity: maximum_quantity - final_balance,
                comment: None,
                confirmed: false,
            })
        })
        .collect::<Result<Vec<RnRFormLineRow>, RepositoryError>>();

    rnr_form_lines
}

pub fn get_lookback_months(period: &PeriodRow) -> u32 {
    let years_since_start = period
        .end_date
        .years_since(period.start_date)
        .unwrap_or_default();

    // TODO; use historic consumption i think that does this for us already :eyes
    // TODO: what to do here if period is less than month?
    // TODO: THIS IS WHAT WE DOO OOPS
    // e.g. 1st to 31st rather than 1st to 1st of next month? is that a training thing?
    let months_since_start = (12 + period.end_date.month() - period.start_date.month()) % 12;

    (years_since_start * 12) + months_since_start
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

fn get_last_rnr_form_lines(
    connection: &StorageConnection,
    previous_form_id: Option<String>,
) -> Result<HashMap<String, RnRFormLineRow>, RepositoryError> {
    let mut form_lines_by_item_id = HashMap::new();

    match previous_form_id {
        Some(previous_form_id) => {
            let rows = RnRFormLineRowRepository::new(connection)
                .find_many_by_rnr_form_id(&previous_form_id)?;

            for row in rows.into_iter() {
                form_lines_by_item_id.insert(row.item_id.clone(), row);
            }
        }
        None => (),
    }

    Ok(form_lines_by_item_id)
}

fn get_opening_balance() -> f64 {
    // get current SOH, subtract all movements until date... could be v expenny!!
    // shooould only be on first one.
    0.0
}

fn get_stock_out_duration(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
    end_datetime: NaiveDateTime,
    days_in_period: i64,
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
            number_of_historic_data_points: days_in_period as u32,
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
