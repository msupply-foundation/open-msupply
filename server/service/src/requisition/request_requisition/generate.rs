use chrono::Utc;
use repository::vaccination_course::VaccinationCourseRepository;
use repository::vaccine_course::vaccine_course_item_row::VaccineCourseItemRowRepository;
use repository::{
    EqualFilter, ItemLinkRowRepository, RequisitionLineRow, RequisitionRow, StoreFilter,
    StoreRepository,
};
use util::uuid::uuid;

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

pub fn get_population_served(ctx: &ServiceContext, store_id: &str) -> Option<i32> {
    let connection = &ctx.connection;

    let repository = StoreRepository::new(&connection);

    let store = repository.query_one(StoreFilter::new().id(EqualFilter::equal_to(store_id)));

    match store {
        Ok(Some(store)) => {
            match store.name_row.properties {
                Some(properties_json) => {
                    serde_json::from_str::<serde_json::Value>(&properties_json)
                        .ok()
                        .and_then(|json_value| {
                            json_value
                                .get("population_served")
                                .and_then(|v| v.as_i64())
                                .map(|v| v as i32)
                        })
                }
                None => None, // No properties field
            }
        }
        Ok(None) => None,
        Err(_) => None,
    }
}

pub fn get_num_doses(ctx: &ServiceContext, item_id: &str) -> Option<i32> {
    dbg!(item_id);
    let connection = &ctx.connection;
    let repository = VaccinationCourseRepository::new(&connection);
    let rows = repository.query_by_item_id(item_id.to_string());

    dbg!(&rows);

    match rows {
        Ok(rows) => {
            if rows.is_empty() {
                return None;
            }
            let num_doses = rows.len() as i32;
            return Some(num_doses);
        }
        Err(_) => return None,
    }
}

pub fn generate_requisition_lines(
    ctx: &ServiceContext,
    store_id: &str,
    requisition_row: &RequisitionRow,
    item_ids: Vec<String>,
) -> Result<Vec<RequisitionLineRow>, PluginOrRepositoryError> {
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

            // TO-DO: Check pref for real
            let forecasting_pref = true;

            let (
                forecast_num_people,
                forecast_num_doses,
                forecast_coverage_rate,
                forecast_loss_factor,
            ) = if forecasting_pref {
                (
                    get_population_served(ctx, store_id),
                    get_num_doses(ctx, &item_stats.item_id),
                    // get_num_doses(ctx, store_id, item_stats.item_id),
                    Some(6.6),
                    Some(6.6),
                )
            } else {
                (None, None, None, None)
            };

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
                forecast_num_people,
                forecast_num_doses,
                forecast_coverage_rate,
                forecast_loss_factor,
            }
        })
        .collect();

    Ok(lines)
}
