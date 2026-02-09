use super::get_period_length;
use crate::{
    requisition_line::chart::calculate_historic_stock_evolution, service_provider::ServiceContext,
    store_preference::get_store_preferences,
};
use chrono::{Duration, NaiveDate, Utc};
use repository::{
    AdjustmentFilter, AdjustmentRepository, ConsumptionFilter, ConsumptionRepository, DateFilter,
    DatetimeFilter, EqualFilter, MasterListLineFilter, MasterListLineRepository, Pagination,
    PeriodRow, ReplenishmentFilter, ReplenishmentRepository, RepositoryError, RnRForm,
    RnRFormFilter, RnRFormLineRow, RnRFormLineRowRepository, RnRFormLowStock, RnRFormRepository,
    StockLineFilter, StockLineRepository, StockLineSort, StockLineSortField, StockMovementFilter,
    StockMovementRepository, StockMovementRow, StockOnHandFilter, StockOnHandRepository,
    StorageConnection,
};
use std::{collections::HashMap, ops::Neg};
use util::{
    constants::APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30, date_with_offset, pos_zero, uuid::uuid,
};

// Further improvements to R&R performance could include:
// - Querying stock movements once
// - Moving some of the calculations to SQL (e.g. stock out durations, opening
//   balances)
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
    let previous_rnr_form_lines_by_item_id = get_rnr_form_lines_map(
        &ctx.connection,
        previous_form
            .as_ref()
            .map(|f| f.rnr_form_row.id.to_string()),
    )?;

    // Get monthly consumption for each item from previous forms
    let previous_monthly_consumption = get_previous_monthly_consumption(
        &ctx.connection,
        RnRFormFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .period_schedule_id(EqualFilter::equal_to(period.period_schedule_id.to_string()))
            .program_id(EqualFilter::equal_to(program_id.to_string())),
    )?;

    let store_preferences = get_store_preferences(&ctx.connection, store_id)?;

    let opening_balances = get_bulk_opening_balances(
        &ctx.connection,
        &previous_rnr_form_lines_by_item_id,
        store_id,
        &master_list_item_ids,
        period.start_date,
    )?;

    let stock_out_durations = get_stock_out_durations_batch(
        &ctx.connection,
        store_id,
        &master_list_item_ids,
        period.end_date,
        period_length_in_days as u32,
        &opening_balances,
        &usage_by_item_map,
    )?;

    let earliest_expiries =
        get_bulk_earliest_expiries(&ctx.connection, store_id, &master_list_item_ids)?;

    // Generate line for each item in the master list
    let rnr_form_lines = master_list_item_ids
        .into_iter()
        .map(|item_id| {
            let initial_balance = opening_balances.get(&item_id).copied().unwrap_or(0.0);
            let usage = usage_by_item_map.get(&item_id).copied().unwrap_or_default();

            let final_balance =
                initial_balance + usage.replenished - usage.consumed + usage.adjusted;

            let stock_out_duration = stock_out_durations.get(&item_id).copied().unwrap_or(0);

            let adjusted_quantity_consumed = get_adjusted_quantity_consumed(
                period_length_in_days,
                stock_out_duration as i64,
                usage.consumed,
            );

            let previous_monthly_consumption = previous_form
                .as_ref()
                .and_then(|_| previous_monthly_consumption.get(&item_id))
                .cloned()
                .unwrap_or_default();

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

            let minimum_quantity =
                average_monthly_consumption * store_preferences.months_understock;
            let maximum_quantity = average_monthly_consumption * store_preferences.months_overstock;

            let calculated_requested_quantity = if maximum_quantity - final_balance > 0.0 {
                maximum_quantity - final_balance
            } else {
                0.0
            };

            let earliest_expiry = earliest_expiries.get(&item_id).copied();

            Ok(RnRFormLineRow {
                id: uuid(),
                rnr_form_id: rnr_form_id.to_string(),
                item_link_id: item_id,
                requisition_line_id: None,
                previous_monthly_consumption_values,
                average_monthly_consumption,
                initial_balance: pos_zero(initial_balance),

                snapshot_quantity_received: usage.replenished,
                snapshot_quantity_consumed: usage.consumed,
                snapshot_adjustments: usage.adjusted,
                entered_quantity_received: None,
                entered_adjustments: None,
                entered_quantity_consumed: None,
                entered_losses: None,

                stock_out_duration,
                adjusted_quantity_consumed,
                final_balance: pos_zero(final_balance),
                maximum_quantity,
                minimum_quantity,
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
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_to(master_list_id.to_string())),
            None,
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
            form_lines_by_item_id.insert(row.item_link_id.clone(), row);
        }
    }
    Ok(form_lines_by_item_id)
}

pub fn get_amc(
    period_length_in_days: i64,
    adjusted_quantity_consumed: f64,
    previous_monthly_consumption_values: &Vec<f64>,
) -> f64 {
    let period_months = period_length_in_days as f64 / APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30;
    let monthly_consumption_this_period = adjusted_quantity_consumed / period_months;

    // In `get_previous_monthly_consumption` we only ever take the last 2 forms
    // but if requirements change this calculation can accept more
    let num_previous_data_points = previous_monthly_consumption_values.len() as f64;

    let total_previous_monthly_consumption =
        previous_monthly_consumption_values.iter().sum::<f64>();

    // Calculate AMC for this period
    (total_previous_monthly_consumption + monthly_consumption_this_period)
        / (num_previous_data_points + 1.0)
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
        let period_months = period_length_in_days as f64 / APPROX_NUMBER_OF_DAYS_IN_A_MONTH_IS_30;

        let lines = line_repo.find_many_by_rnr_form_id(&form.rnr_form_row.id)?;

        for line in lines.into_iter() {
            let amc_values = monthly_consumption_by_item_id
                .entry(line.item_link_id.clone())
                .or_insert(vec![]);

            let monthly_consumption_this_period = line.adjusted_quantity_consumed / period_months;

            amc_values.push(monthly_consumption_this_period);
        }
    }

    Ok(monthly_consumption_by_item_id)
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
    let store_id_filter = Some(EqualFilter::equal_to(store_id.to_string()));
    let date_filter = Some(DateFilter::date_range(&start_date, end_date));

    // Get all usage rows for the period
    let consumption_rows =
        ConsumptionRepository::new(connection).query(Some(ConsumptionFilter {
            item_id: item_id_filter.clone(),
            store_id: store_id_filter.clone(),
            date: date_filter.clone(),
            ..Default::default()
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

fn get_low_stock_status(final_balance: f64, maximum_quantity: f64) -> RnRFormLowStock {
    if final_balance < maximum_quantity / 4.0 {
        return RnRFormLowStock::BelowQuarter;
    }
    if final_balance < maximum_quantity / 2.0 {
        return RnRFormLowStock::BelowHalf;
    }

    RnRFormLowStock::Ok
}

/**
 * Opening balance for R&R form lines is either:
 * - The final balance from the previous R&R form for that item (if it exists)
 * - Or, if there is no previous R&R form line for that item, we calculate it from stock movements
 */
pub fn get_bulk_opening_balances(
    connection: &StorageConnection,
    previous_rnr_form_lines_by_item_id: &HashMap<String, RnRFormLineRow>,
    store_id: &str,
    item_ids: &[String],
    start_date: NaiveDate,
) -> Result<HashMap<String, f64>, RepositoryError> {
    let mut opening_balances = HashMap::new();

    for item_id in item_ids {
        if let Some(previous_row) = previous_rnr_form_lines_by_item_id.get(item_id) {
            opening_balances.insert(item_id.clone(), previous_row.final_balance);
        }
    }

    let items_needing_calculation: Vec<String> = item_ids
        .iter()
        .filter(|item_id| !opening_balances.contains_key(*item_id))
        .cloned()
        .collect();

    if !items_needing_calculation.is_empty() {
        // Get all movements between the start date and now for all items needing calculation
        let stock_movement_rows = StockMovementRepository::new(connection).query(Some(
            StockMovementFilter::new()
                .store_id(EqualFilter::equal_to(store_id.to_string()))
                .item_id(EqualFilter::equal_any(items_needing_calculation.clone()))
                .datetime(DatetimeFilter::date_range(
                    start_date.into(),
                    Utc::now().naive_utc(),
                )),
        ))?;

        let mut movements_by_item: HashMap<String, f64> = HashMap::new();
        for movement in stock_movement_rows {
            *movements_by_item
                .entry(movement.item_id.clone())
                .or_insert(0.0) += movement.quantity;
        }

        let stock_on_hand_rows = StockOnHandRepository::new(connection).query(Some(
            StockOnHandFilter::new()
                .store_id(EqualFilter::equal_to(store_id.to_string()))
                .item_id(EqualFilter::equal_any(items_needing_calculation.clone())),
        ))?;

        let stock_on_hand_by_item: HashMap<String, f64> = stock_on_hand_rows
            .into_iter()
            .map(|row| (row.item_id, row.total_stock_on_hand))
            .collect();

        for item_id in items_needing_calculation {
            let stock_on_hand_now = stock_on_hand_by_item.get(&item_id).copied().unwrap_or(0.0);
            let total_movements_since_start =
                movements_by_item.get(&item_id).copied().unwrap_or(0.0);
            let opening_balance = stock_on_hand_now - total_movements_since_start;
            opening_balances.insert(item_id, opening_balance);
        }
    }

    Ok(opening_balances)
}

pub fn get_stock_out_durations_batch(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: &[String],
    end_date: NaiveDate,
    days_in_period: u32,
    opening_balances: &HashMap<String, f64>,
    usage_by_item_map: &HashMap<String, UsageStats>,
) -> Result<HashMap<String, i32>, RepositoryError> {
    let mut stock_out_durations = HashMap::new();

    let period_start_date =
        date_with_offset(&end_date, Duration::days((days_in_period as i64 - 1).neg()));

    let stock_movement_rows = StockMovementRepository::new(connection).query(Some(
        StockMovementFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .item_id(EqualFilter::equal_any(item_ids.to_vec()))
            .datetime(DatetimeFilter::date_range(
                period_start_date.and_hms_opt(0, 0, 0).unwrap(),
                end_date.and_hms_milli_opt(23, 59, 59, 999).unwrap(),
            )),
    ))?;

    for item_id in item_ids {
        let usage = usage_by_item_map.get(item_id).copied().unwrap_or_default();
        let initial_balance = opening_balances.get(item_id).copied().unwrap_or(0.0);
        let closing_quantity =
            initial_balance + usage.replenished - usage.consumed + usage.adjusted;

        // When calculated closing quantity is 0 or negative but there was replenishment,
        // use the replenishment amount as the final stock quantity
        let final_stock_quantity = if closing_quantity <= 0.0 && usage.replenished > 0.0 {
            usage.replenished.max(0.0)
        } else {
            closing_quantity.max(0.0)
        };

        let item_movements: Vec<StockMovementRow> = stock_movement_rows
            .iter()
            .filter(|movement| movement.item_id == *item_id)
            .cloned()
            .collect();

        // Generate the list of dates for the period
        let mut historic_points = Vec::new();
        for day_offset in 0..days_in_period {
            let date = date_with_offset(&period_start_date, Duration::days(day_offset as i64));
            historic_points.push(date);
        }

        let stock_evolution = calculate_historic_stock_evolution(
            final_stock_quantity as u32,
            historic_points,
            item_movements,
        );

        let days_out_of_stock = stock_evolution
            .into_iter()
            .filter(|point| point.quantity == 0.0)
            .count() as i32;

        let stock_out_duration = if days_out_of_stock == days_in_period as i32 {
            0
        } else {
            days_out_of_stock
        };

        stock_out_durations.insert(item_id.clone(), stock_out_duration);
    }

    Ok(stock_out_durations)
}

pub fn get_bulk_earliest_expiries(
    connection: &StorageConnection,
    store_id: &str,
    item_ids: &[String],
) -> Result<HashMap<String, NaiveDate>, RepositoryError> {
    let mut expiries = HashMap::new();

    let filter = StockLineFilter::new()
        .store_id(EqualFilter::equal_to(store_id.to_string()))
        .item_id(EqualFilter::equal_any(item_ids.to_vec()))
        // Note: this is available stock _now_, not what would have been available at the closing time of the period
        .is_available(true);

    let stock_lines = StockLineRepository::new(connection).query(
        Pagination::all(),
        Some(filter),
        Some(StockLineSort {
            key: StockLineSortField::ExpiryDate,
            // Descending, then pop last entry for earliest expiry
            desc: Some(true),
        }),
        Some(store_id.to_string()),
    )?;

    for line in stock_lines.into_iter() {
        if let Some(expiry) = line.stock_line_row.expiry_date {
            let entry = expiries.entry(line.item_row.id.clone()).or_insert(expiry);
            if expiry < *entry {
                *entry = expiry;
            }
        }
    }

    Ok(expiries)
}
