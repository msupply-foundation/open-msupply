use chrono::{NaiveDate, Utc};
use repository::{RequisitionLineRow, RequisitionRow};
use util::uuid::uuid;

use crate::item_stats::get_item_stats;
use crate::pricing::item_price::{get_pricing_for_items, ItemPriceLookup};
use crate::requisition::common::get_indicative_price_pref;
use crate::service_provider::ServiceContext;
use crate::PluginOrRepositoryError;

pub struct GenerateSuggestedQuantity {
    pub average_monthly_consumption: f64,
    pub available_stock_on_hand: f64,
    pub min_months_of_stock: f64,
    pub max_months_of_stock: f64,
}

pub fn generate_suggested_quantity(
    GenerateSuggestedQuantity {
        average_monthly_consumption,
        available_stock_on_hand,
        min_months_of_stock,
        max_months_of_stock,
    }: GenerateSuggestedQuantity,
) -> f64 {
    if average_monthly_consumption == 0.0 {
        return 0.0;
    }
    let months_of_stock = available_stock_on_hand / average_monthly_consumption;

    let default_min_months_of_stock = if min_months_of_stock == 0.0 {
        max_months_of_stock
    } else {
        min_months_of_stock
    };

    if max_months_of_stock == 0.0 || (months_of_stock > default_min_months_of_stock) {
        return 0.0;
    }

    // Suggested quantity should always round up - we order in units and otherwise we could under-order by a fraction
    ((max_months_of_stock - months_of_stock) * average_monthly_consumption).ceil()
}

pub fn generate_requisition_lines(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    item_ids: Vec<String>,
    period_end: Option<NaiveDate>,
) -> Result<Vec<RequisitionLineRow>, PluginOrRepositoryError> {
    let item_stats_rows = get_item_stats(&ctx.connection, store_id, None, item_ids, period_end)?;
    let populate_price_per_unit = get_indicative_price_pref(&ctx.connection)?;
    let price_list = if populate_price_per_unit {
        Some(get_pricing_for_items(
            &ctx.connection,
            ItemPriceLookup {
                item_ids: item_stats_rows
                    .iter()
                    .map(|i| i.item_id.to_string())
                    .collect(),
                customer_name_id: None,
            },
        )?)
    } else {
        None
    };

    let lines = item_stats_rows
        .into_iter()
        .enumerate()
        .map(|(i, item_stats)| {
            let average_monthly_consumption = item_stats.average_monthly_consumption;
            let available_stock_on_hand = item_stats.available_stock_on_hand;
            let suggested_quantity = generate_suggested_quantity(GenerateSuggestedQuantity {
                average_monthly_consumption,
                available_stock_on_hand,
                min_months_of_stock: requisition_row.min_months_of_stock,
                max_months_of_stock: requisition_row.max_months_of_stock,
            });

            RequisitionLineRow {
                id: uuid(),
                requisition_id: requisition_row.id.clone(),
                item_link_id: item_stats.item_id.clone(),
                item_name: item_stats.item_name,
                suggested_quantity,
                available_stock_on_hand,
                average_monthly_consumption,
                snapshot_datetime: Some(Utc::now().naive_utc()),
                price_per_unit: if let Some(price_list) = &price_list {
                    price_list[i].calculated_price_per_unit
                } else {
                    None
                },
                // Default
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
