use crate::item_stats::get_item_stats;
use crate::location::query::get_available_volume_by_location_type;
use crate::pricing::item_price::{get_pricing_for_items, ItemPriceLookup};
use crate::requisition::common::get_indicative_price_pref;
use crate::service_provider::ServiceContext;
use crate::PluginOrRepositoryError;
use chrono::{NaiveDate, Utc};
use repository::{RequisitionLineRow, RequisitionRow};
use util::uuid::uuid;

/// Build new `RequisitionLineRow`s from item stats — pure shape function.
/// Forecast snapshot, headline monthly usage, and suggested quantity are all
/// left at their defaults; the caller upserts these rows and then calls
/// [`recompute_forecasts_and_suggested_quantities`] to populate them.
///
/// [`recompute_forecasts_and_suggested_quantities`]: crate::requisition::request_requisition::recompute::recompute_forecasts_and_suggested_quantities
pub fn generate_requisition_lines(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    item_ids: Vec<String>,
    period_end: Option<NaiveDate>,
) -> Result<Vec<RequisitionLineRow>, PluginOrRepositoryError> {
    let item_stats_rows = get_item_stats(&ctx.connection, store_id, None, item_ids, period_end)?;
    let populate_price_per_unit = get_indicative_price_pref(&ctx.connection, store_id)?;
    let item_ids = item_stats_rows
        .iter()
        .map(|i| i.item_id.to_string())
        .collect::<Vec<String>>();
    let price_list = if populate_price_per_unit {
        Some(get_pricing_for_items(
            &ctx.connection,
            ItemPriceLookup {
                item_ids: item_ids.clone(),
                customer_name_id: None,
            },
        )?)
    } else {
        None
    };
    let available_volumes =
        get_available_volume_by_location_type(&ctx.connection, store_id, &item_ids)?;

    let lines: Vec<RequisitionLineRow> = item_stats_rows
        .into_iter()
        .map(|item_stats| {
            let available_volume_by_type = available_volumes
                .get(&item_stats.item_id)
                .cloned()
                .unwrap_or_default();
            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_link_id: item_stats.item_id.clone(),
                item_name: item_stats.item_name,
                available_stock_on_hand: item_stats.available_stock_on_hand,
                average_monthly_consumption: item_stats.average_monthly_consumption,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                price_per_unit: if let Some(price_list) = &price_list {
                    price_list
                        .get(&item_stats.item_id)
                        .cloned()
                        .unwrap_or_default()
                        .calculated_price_per_unit
                } else {
                    None
                },
                available_volume: available_volume_by_type.available_volume,
                location_type_id: available_volume_by_type.restricted_location_type_id,
                // Filled by `recompute_forecasts_and_suggested_quantities`:
                forecast_monthly_usage: None,
                forecast_method: None,
                forecast_data: None,
                suggested_quantity: 0.0,
                // Other defaults:
                comment: None,
                supply_quantity: 0.0,
                requested_quantity: 0.0,
                approved_quantity: 0.0,
                approval_comment: None,
                initial_stock_on_hand_units: 0.0,
                incoming_units: 0.0,
                outgoing_units: 0.0,
                loss_in_units: 0.0,
                addition_in_units: 0.0,
                expiring_units: 0.0,
                days_out_of_stock: 0.0,
                option_id: None,
            }
        })
        .collect();

    Ok(lines)
}
