use std::{collections::HashMap, ops::Neg};

use chrono::{Duration, NaiveDate};
use repository::{
    AdjustmentFilter, AdjustmentRepository, ConsumptionFilter, ConsumptionRepository, DateFilter,
    DatetimeFilter, EqualFilter, MasterListLineFilter, MasterListLineRepository, Pagination,
    PeriodRow, ReplenishmentFilter, ReplenishmentRepository, RepositoryError, RnRForm,
    RnRFormFilter, RnRFormLineRow, RnRFormLineRowRepository, RnRFormLowStock, RnRFormRepository,
    StockLineFilter, StockLineRepository, StockLineSort, StockLineSortField, StockMovementFilter,
    StockMovementRepository, StockOnHandFilter, StockOnHandRepository, StorageConnection,
};
use util::{constants::NUMBER_OF_DAYS_IN_A_MONTH, date_now, date_with_offset, uuid::uuid};

use crate::{
    requisition_line::chart::{get_stock_evolution_for_item, StockEvolutionOptions},
    service_provider::ServiceContext,
};

use super::get_period_length;

// Would be nice if this was an OMS store pref
const TARGET_MOS: f64 = 2.0;

pub fn generate_rnr_form_lines(
    ctx: &ServiceContext,
    store_id: &str,
    rnr_form_id: &str,
    program_id: &str,
    master_list_id: &str,
    period: PeriodRow,
    previous_form: Option<RnRForm>,
) -> Result<Vec<RnRFormLineRow>, RepositoryError> {
    let master_list_item_ids = get_master_list_item_ids(ctx, master_list_id)?;

    let period_length_in_days = get_period_length(&period);

    // Get consumption/replenishment/adjustment stats for each item in the master list
    let usage_by_item_map = get_usage_map(
        &ctx.connection,
        store_id,
        Some(EqualFilter::equal_any(master_list_item_ids.clone())),
        period_length_in_days,
        &period.end_date,
    )?;

    // Get previous form data for initial balances
    let previous_rnr_form_lines_by_item_id =
        get_rnr_form_lines_map(&ctx.connection, previous_form.map(|f| f.rnr_form_row.id))?;

    // Get monthly consumption for each item from previous forms
    let previous_monthly_consumption = get_previous_monthly_consumption(
        &ctx.connection,
        RnRFormFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .period_schedule_id(EqualFilter::equal_to(&period.period_schedule_id))
            .program_id(EqualFilter::equal_to(program_id)),
    )?;

    // Generate line for each item in the master list
    let rnr_form_lines = master_list_item_ids
        .into_iter()
        .map(|item_id| {
            // Initial balance is either:
            // - Use the previous form's final balance
            // - If not available, calculate retrospectively from stock movements
            let initial_balance = get_opening_balance(
                &ctx.connection,
                previous_rnr_form_lines_by_item_id.get(&item_id),
                store_id,
                &item_id,
                period.start_date,
            )?;

            let usage = usage_by_item_map.get(&item_id).copied().unwrap_or_default();

            let final_balance =
                initial_balance + usage.replenished - usage.consumed + usage.adjusted;

            let stock_out_duration = get_stock_out_duration(
                &ctx.connection,
                store_id,
                &item_id,
                period.end_date,
                period_length_in_days as u32,
                final_balance,
            )?;

            let adjusted_quantity_consumed = get_adjusted_quantity_consumed(
                period_length_in_days,
                stock_out_duration as i64,
                usage.consumed,
            );

            let previous_monthly_consumption = match previous_monthly_consumption.get(&item_id) {
                Some(monthly_consumption) => monthly_consumption.clone(),
                None => vec![],
            };

            let average_monthly_consumption = get_amc(
                period_length_in_days,
                adjusted_quantity_consumed,
                &previous_monthly_consumption,
            );

            // We store these on the R&R form line so the frontend can recalculate AMC if needed
            let previous_monthly_consumption_values = previous_monthly_consumption
                .iter()
                .map(|v| v.to_string())
                .collect::<Vec<String>>()
                .join(",");

            let maximum_quantity = average_monthly_consumption * TARGET_MOS;

            let calculated_requested_quantity = if maximum_quantity - final_balance > 0.0 {
                maximum_quantity - final_balance
            } else {
                0.0
            };

            let earliest_expiry = get_earliest_expiry(&ctx.connection, store_id, &item_id)?;

            Ok(RnRFormLineRow {
                id: uuid(),
                rnr_form_id: rnr_form_id.to_string(),
                item_id,
                requisition_line_id: None,
                previous_monthly_consumption_values,
                average_monthly_consumption,
                initial_balance,

                snapshot_quantity_received: usage.replenished,
                snapshot_quantity_consumed: usage.consumed,
                snapshot_adjustments: usage.adjusted,
                entered_quantity_received: None,
                entered_adjustments: None,
                entered_quantity_consumed: None,

                stock_out_duration,
                adjusted_quantity_consumed,
                final_balance,
                maximum_quantity,
                expiry_date: earliest_expiry,
                calculated_requested_quantity,
                low_stock: get_low_stock_status(final_balance, maximum_quantity),
                entered_requested_quantity: None,
                comment: None,
                confirmed: false,
            })
        })
        .collect::<Result<Vec<RnRFormLineRow>, RepositoryError>>();

    rnr_form_lines
}

// ---- ---- ---- ----
// HELPER FUNCTIONS
// ---- ---- ---- ----

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

fn get_rnr_form_lines_map(
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

pub fn get_amc(
    period_length_in_days: i64,
    adjusted_quantity_consumed: f64,
    previous_monthly_consumption_values: &Vec<f64>,
) -> f64 {
    let period_months = period_length_in_days as f64 / NUMBER_OF_DAYS_IN_A_MONTH;
    let monthly_consumption_this_period = adjusted_quantity_consumed / period_months;

    // In `get_previous_monthly_consumption` we only ever take the last 2 forms
    // but if requirements change this calculation can accept more
    let num_previous_data_points = previous_monthly_consumption_values.len() as f64;

    let total_previous_monthly_consumption =
        previous_monthly_consumption_values.iter().sum::<f64>();

    // Calculate AMC for this period
    let this_period_amc = (total_previous_monthly_consumption + monthly_consumption_this_period)
        / (num_previous_data_points + 1.0);

    this_period_amc
}

pub fn get_previous_monthly_consumption(
    connection: &StorageConnection,
    filter: RnRFormFilter,
) -> Result<HashMap<String, Vec<f64>>, RepositoryError> {
    let previous_forms = RnRFormRepository::new(connection).query_by_filter(filter)?;

    let len = previous_forms.len();

    let prev_forms = match len {
        // If no previous forms, return
        0 => return Ok(HashMap::new()),
        // If only one previous form, just use that
        1 => vec![previous_forms[0].clone()],
        // For now, we'll just average the last two forms... could do more periods/customise this!
        _ => previous_forms[len - 2..len].to_vec(),
    };

    let mut monthly_consumption_by_item_id = HashMap::new();

    let line_repo = RnRFormLineRowRepository::new(connection);

    // For each of the previous forms, collate the monthly consumption values for each item
    for form in prev_forms {
        let period_length_in_days = get_period_length(&form.period_row);
        let period_months = period_length_in_days as f64 / NUMBER_OF_DAYS_IN_A_MONTH;

        let lines = line_repo.find_many_by_rnr_form_id(&form.rnr_form_row.id)?;

        for line in lines.into_iter() {
            let amc_values = monthly_consumption_by_item_id
                .entry(line.item_id.clone())
                .or_insert(vec![]);

            let monthly_consumption_this_period = line.adjusted_quantity_consumed / period_months;

            amc_values.push(monthly_consumption_this_period);
        }
    }

    Ok(monthly_consumption_by_item_id)
}

pub fn get_opening_balance(
    connection: &StorageConnection,
    previous_row: Option<&RnRFormLineRow>,
    store_id: &str,
    item_id: &str,
    start_date: NaiveDate,
) -> Result<f64, RepositoryError> {
    if let Some(previous_row) = previous_row {
        return Ok(previous_row.final_balance);
    }

    // Find all the store movement values between the start_date and now
    // Take those stock movements away from the current stock on hand, to retrospectively calculate what was available at that time.
    let filter = StockMovementFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .item_id(EqualFilter::equal_to(item_id))
        .datetime(DatetimeFilter::date_range(
            start_date.into(),
            date_now().into(),
        ));

    let stock_movement_rows = StockMovementRepository::new(connection).query(Some(filter))?;

    let total_movements_since_start_date: f64 = stock_movement_rows
        .into_iter()
        .map(|row| row.quantity)
        .sum();

    let stock_on_hand_now = StockOnHandRepository::new(connection)
        .query_one(
            StockOnHandFilter::new()
                .store_id(EqualFilter::equal_to(store_id))
                .item_id(EqualFilter::equal_to(item_id)),
        )?
        .map(|row| row.total_stock_on_hand)
        .unwrap_or(0.0);

    Ok(stock_on_hand_now - total_movements_since_start_date)
}

pub fn get_stock_out_duration(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
    end_date: NaiveDate,
    days_in_period: u32,
    closing_quantity: f64,
) -> Result<i32, RepositoryError> {
    let end_datetime = end_date
        .and_hms_milli_opt(23, 59, 59, 999)
        // Should always be able to create end of day datetime, so this error shouldn't be possible
        .ok_or(RepositoryError::as_db_error(
            "Could not determine closing datetime",
            "",
        ))?;

    let evolution = get_stock_evolution_for_item(
        connection,
        store_id,
        item_id,
        end_datetime,
        closing_quantity as u32,
        date_now(), // only used for future projections, not needed here
        0,          // only used for future projections, not needed here
        0.0,        // only used for future projections, not needed here
        StockEvolutionOptions {
            number_of_historic_data_points: days_in_period,
            number_of_projected_data_points: 0,
        },
    )?;

    let days_out_of_stock = evolution
        .historic_stock
        .into_iter()
        .filter(|point| point.quantity == 0.0)
        .count() as i32;

    if days_out_of_stock == days_in_period as i32 {
        // If there was no consumption data, we'll set stock out duration to 0 and let the user input this
        Ok(0)
    } else {
        Ok(days_out_of_stock)
    }
}

// If stock had been available for the entire period, this is the quantity that 'would' have been consumed
pub fn get_adjusted_quantity_consumed(
    period_length_in_days: i64,
    stock_out_duration: i64,
    consumed: f64,
) -> f64 {
    let days_in_stock = period_length_in_days - stock_out_duration;

    match days_in_stock {
        0 => consumed,
        days_in_stock => consumed * period_length_in_days as f64 / days_in_stock as f64,
    }
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
    period_length_in_days: i64,
    end_date: &NaiveDate,
) -> Result<HashMap<String, UsageStats>, RepositoryError> {
    // period length is inclusive, so -1, otherwise `start_date` would actually be end_date of last period
    let lookback_days = period_length_in_days - 1;

    let start_date = date_with_offset(end_date, Duration::days(lookback_days).neg());
    let store_id_filter = Some(EqualFilter::equal_to(store_id));
    let date_filter = Some(DateFilter::date_range(&start_date, end_date));

    // Get all usage rows for the period
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

    // Total up usage stats for each item
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

pub fn get_earliest_expiry(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
) -> Result<Option<NaiveDate>, RepositoryError> {
    let filter = StockLineFilter::new()
        .store_id(EqualFilter::equal_to(store_id))
        .item_id(EqualFilter::equal_to(item_id))
        // Note: this is available stock _now_, not what would have been available at the closing time of the period
        .is_available(true);

    let earliest_expiring = StockLineRepository::new(connection)
        .query(
            Pagination::all(),
            Some(filter),
            Some(StockLineSort {
                key: StockLineSortField::ExpiryDate,
                // Descending, then pop last entry for earliest expiry
                desc: Some(true),
            }),
            Some(store_id.to_string()),
        )?
        .pop();

    Ok(earliest_expiring.and_then(|line| line.stock_line_row.expiry_date))
}

fn get_low_stock_status(final_balance: f64, maximum_quantity: f64) -> RnRFormLowStock {
    if final_balance < maximum_quantity / 4.0 {
        return RnRFormLowStock::BelowQuarter;
    }
    if final_balance < maximum_quantity / 2.0 {
        return RnRFormLowStock::BelowHalf;
    }

    RnRFormLowStock::Ok
}
