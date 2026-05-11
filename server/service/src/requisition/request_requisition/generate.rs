use crate::item_stats::get_item_stats;
use crate::location::query::get_available_volume_by_location_type;
use crate::preference::preferences::DisplayPopulationBasedForecasting;
use crate::preference::types::Preference;
use crate::pricing::item_price::{get_pricing_for_items, ItemPriceLookup};
use crate::requisition::common::get_indicative_price_pref;
use crate::requisition::request_requisition::generate_population_forecast::calculate_forecasting_fields;
use crate::service_provider::ServiceContext;
use crate::PluginOrRepositoryError;
use chrono::{NaiveDate, Utc};
use repository::{RequisitionLineRow, RequisitionRow};
use util::uuid::uuid;

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

    let display_forecasting = DisplayPopulationBasedForecasting
        .load(&ctx.connection, None)
        .unwrap_or(false);

    let population_forecast = if display_forecasting {
        calculate_forecasting_fields(ctx, item_ids.clone())?
    } else {
        std::collections::HashMap::new()
    };

    let lines = item_stats_rows
        .into_iter()
        .map(
            |item_stats| -> Result<RequisitionLineRow, PluginOrRepositoryError> {
                let average_monthly_consumption = item_stats.average_monthly_consumption;
                let available_stock_on_hand = item_stats.available_stock_on_hand;
                let forecast_total_units = population_forecast
                    .get(&item_stats.item_id)
                    .and_then(|opt| opt.as_ref())
                    .map(|f| f.forecast_total_units);

                let suggested_quantity = match (display_forecasting, forecast_total_units) {
                    (true, Some(forecast_units)) if forecast_units > available_stock_on_hand => {
                        (forecast_units - available_stock_on_hand).ceil()
                    }
                    (true, Some(_)) => 0.0,
                    _ => generate_suggested_quantity(GenerateSuggestedQuantity {
                        average_monthly_consumption,
                        available_stock_on_hand,
                        min_months_of_stock: requisition_row.min_months_of_stock,
                        max_months_of_stock: requisition_row.max_months_of_stock,
                    }),
                };
                let available_volume_by_type = available_volumes
                    .get(&item_stats.item_id)
                    .cloned()
                    .unwrap_or_default();
                let population_forecast_for_item = population_forecast
                    .get(&item_stats.item_id)
                    .and_then(|opt| opt.as_ref());

                Ok(RequisitionLineRow {
                    id: uuid(),
                    requisition_id: requisition_row.id.clone(),
                    item_link_id: item_stats.item_id.clone(),
                    item_name: item_stats.item_name,
                    suggested_quantity,
                    available_stock_on_hand,
                    average_monthly_consumption,
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
                    forecast_total_units,
                    forecast_total_doses: population_forecast_for_item
                        .map(|f| f.forecast_total_doses),
                    vaccine_courses: population_forecast_for_item
                        .map(|f| serde_json::to_string(&f.vaccine_courses).unwrap_or_default()),
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
                })
            },
        )
        .collect::<Result<Vec<_>, _>>()?;

    Ok(lines)
}
