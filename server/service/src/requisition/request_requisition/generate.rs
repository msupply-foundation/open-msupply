use chrono::Utc;
use repository::{PluginDataRow, PluginType, RequisitionLineRow, RequisitionRow};
use util::uuid::uuid;

use crate::backend_plugin::plugin_provider::PluginInstance;
use crate::backend_plugin::types::transform_requisition_lines;
use crate::item_stats::get_item_stats;
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

    (max_months_of_stock - months_of_stock) * average_monthly_consumption
}

pub fn generate_requisition_lines(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    item_ids: Vec<String>,
) -> Result<(Vec<RequisitionLineRow>, Vec<PluginDataRow>), PluginOrRepositoryError> {
    let item_stats_rows = get_item_stats(ctx, store_id, None, item_ids)?;

    let lines = item_stats_rows
        .into_iter()
        .map(|item_stats| {
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
                item_link_id: item_stats.item_id,
                item_name: item_stats.item_name,
                suggested_quantity,
                available_stock_on_hand,
                average_monthly_consumption,
                snapshot_datetime: Some(Utc::now().naive_utc()),
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

    let Some(plugin) = PluginInstance::get_one(PluginType::TransformRequisitionLines) else {
        return Ok((lines, Vec::new()));
    };

    let result = transform_requisition_lines::Trait::call(
        &(*plugin),
        transform_requisition_lines::Input {
            requisition: requisition_row.clone(),
            lines,
        },
    )?;

    Ok((
        result.transformed_lines,
        result.plugin_data.unwrap_or_default(),
    ))
}
