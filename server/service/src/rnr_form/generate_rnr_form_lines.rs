use repository::{
    EqualFilter, MasterListLineFilter, MasterListLineRepository, PeriodRow, RepositoryError,
    RnRFormLineRow,
};
use util::uuid::uuid;

use crate::{
    item_stats::{get_item_stats, ItemStatsFilter},
    service_provider::ServiceContext,
};

pub fn generate_rnr_form_lines(
    ctx: &ServiceContext,
    rnr_form_id: &str,
    master_list_id: &str,
    period: PeriodRow,
) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
    let master_list_lines = MasterListLineRepository::new(&ctx.connection).query_by_filter(
        MasterListLineFilter::new().master_list_id(EqualFilter::equal_to(master_list_id)),
    )?;

    let item_ids = master_list_lines
        .into_iter()
        .map(|line| line.item_id)
        .collect();

    let item_stats_rows = get_item_stats(
        ctx,
        &ctx.store_id,
        None,
        Some(ItemStatsFilter::new().item_id(EqualFilter::equal_any(item_ids))),
    )?;

    let period_length = period
        .end_date
        .signed_duration_since(period.start_date)
        .num_days() as f64;

    // TODO: oms store pref?? one day :)
    let target_mos = 2;

    let rnr_form_lines = item_stats_rows
        .into_iter()
        .map(|item_stat| {
            // TODO consumption view needs prescriptions added!
            // consumed over period
            let quantity_consumed = 0.0;

            // evolution series (?) - points where soh is 0?
            let stock_out_duration = 0;

            let time_in_stock = period_length - stock_out_duration as f64;

            let adjusted_quantity_consumed = match time_in_stock {
                0.0 => 0.0,
                time_in_stock => quantity_consumed * period_length / time_in_stock,
            };

            // should be total incoming?
            let quantity_received = 0.0;
            let final_balance = 0.0;

            let amc = item_stat.average_monthly_consumption;
            let maximum_quantity = amc * target_mos as f64;

            RnRFormLineRow {
                id: uuid(),
                rnr_form_id: rnr_form_id.to_string(),
                item_id: item_stat.item_id,
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
                expiration_date: None,
                requested_quantity: maximum_quantity - final_balance,
                comment: None,
                confirmed: false,
            }
        })
        .collect();

    Ok(rnr_form_lines)
}
