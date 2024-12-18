use chrono::Utc;
use repository::indicator_value::{IndicatorValueFilter, IndicatorValueRepository};
use repository::{
    EqualFilter, IndicatorValueRow, IndicatorValueType, RepositoryError, RequisitionLineRow,
    RequisitionRow, StorageConnection,
};
use util::uuid::uuid;

use crate::item_stats::{get_item_stats, ItemStatsFilter};
use crate::requisition::program_indicator::query::ProgramIndicator;
use crate::service_provider::ServiceContext;

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
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let item_stats_rows = get_item_stats(
        ctx,
        store_id,
        None,
        Some(ItemStatsFilter::new().item_id(EqualFilter::equal_any(item_ids))),
    )?;

    let result = item_stats_rows
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

    Ok(result)
}

pub struct AggregateInternalOrderIndicatorGenerationInput<'a> {
    pub connection: &'a StorageConnection,
    pub store_id: String,
    pub period_id: String,
    pub program_indicators: Vec<ProgramIndicator>,
    pub other_party_id: String,
    pub customer_store_ids: Vec<String>,
}

pub fn generate_aggregate_indicator_values(
    input: AggregateInternalOrderIndicatorGenerationInput,
) -> Result<Vec<IndicatorValueRow>, RepositoryError> {
    let mut indicator_values = vec![];

    for program_indicator in input.program_indicators {
        for line in program_indicator.lines {
            for column in line.columns {
                let aggregate = match column.value_type {
                    Some(IndicatorValueType::String) => column.default_value.clone(),
                    None => line.line.default_value.clone(),
                    Some(IndicatorValueType::Number) => {
                        let values: Vec<String> = IndicatorValueRepository::new(input.connection)
                            .query_by_filter(
                                IndicatorValueFilter::new()
                                    .indicator_column_id(EqualFilter::equal_to(&column.id))
                                    .indicator_line_id(EqualFilter::equal_to(&line.line.id))
                                    .store_id(EqualFilter::equal_any(
                                        input.customer_store_ids.clone(),
                                    )),
                            )?
                            .into_iter()
                            .map(|v| v.value)
                            .collect();

                        let value_sum: Option<i32> = values
                            .into_iter()
                            .map(|value| value.parse::<i32>())
                            .collect::<Result<Vec<_>, _>>()
                            .map_err(|err| RepositoryError::DBError {
                                msg: "Unable to parse number indicator value".to_string(),
                                extra: format!("{}", err),
                            })?
                            .into_iter()
                            .reduce(|x, y| x + y);

                        if let Some(value_sum) = value_sum {
                            value_sum.to_string()
                        } else {
                            column.default_value.clone()
                        }
                    }
                };

                let indicator_value = IndicatorValueRow {
                    id: uuid(),
                    customer_name_link_id: input.other_party_id.to_string(),
                    store_id: input.store_id.to_string(),
                    period_id: input.period_id.to_string(),
                    indicator_line_id: line.line.id.to_string(),
                    indicator_column_id: column.id.to_string(),
                    // TODO Refactor to only one value query
                    value: aggregate,
                };

                indicator_values.push(indicator_value);
            }
        }
    }

    Ok(indicator_values)
}
