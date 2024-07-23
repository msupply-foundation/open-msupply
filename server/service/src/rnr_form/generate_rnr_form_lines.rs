use chrono::Datelike;
use repository::{
    EqualFilter, MasterListLineFilter, MasterListLineRepository, PeriodRow, RepositoryError,
    RnRFormLineRow,
};
use util::uuid::uuid;

use crate::{
    item_stats::{get_consumption_map, get_consumption_rows},
    service_provider::ServiceContext,
};

// Make this a store pref... in OMS?
const TARGET_MOS: i32 = 2;

pub fn generate_rnr_form_lines(
    ctx: &ServiceContext,
    rnr_form_id: &str,
    master_list_id: &str,
    period: PeriodRow,
) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
    let master_list_item_ids = get_master_list_item_ids(&ctx, master_list_id)?;

    let lookback_months = get_lookback_months(&period);
    let period_length_in_days = period
        .end_date
        .signed_duration_since(period.start_date)
        .num_days();

    let consumption_rows = get_consumption_rows(
        &ctx.connection,
        &ctx.store_id,
        Some(EqualFilter::equal_any(master_list_item_ids.clone())),
        period_length_in_days,
        &period.end_date,
    )?;
    let consumption_map = get_consumption_map(consumption_rows);

    let rnr_form_lines = master_list_item_ids
        .into_iter()
        .map(|item_id| {
            // TODO consumption view needs prescriptions added!
            // consumed over period
            let quantity_consumed = consumption_map.get(&item_id).copied().unwrap_or_default();

            // evolution series (?) - points where soh is 0?
            let stock_out_duration: i32 = 0;

            let days_in_stock = period_length_in_days - stock_out_duration as i64;

            let adjusted_quantity_consumed = match days_in_stock {
                0 => 0.0,
                days_in_stock => quantity_consumed * (period_length_in_days / days_in_stock) as f64,
            };

            // should be total incoming?
            let quantity_received = 0.0;
            let final_balance = 0.0;

            let amc = quantity_consumed / lookback_months as f64;

            let maximum_quantity = amc * TARGET_MOS as f64;

            RnRFormLineRow {
                id: uuid(),
                rnr_form_id: rnr_form_id.to_string(),
                item_id,
                average_monthly_consumption: amc,
                // from prev rnr, if exists, else bal on opening date
                initial_balance: 0.0,

                // incoming over period
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
            }
        })
        .collect();

    Ok(rnr_form_lines)
}

pub fn get_lookback_months(period: &PeriodRow) -> u32 {
    let years_since_start = period
        .end_date
        .years_since(period.start_date)
        .unwrap_or_default();

    // TODO: what to do here if period is less than month?
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
