use std::collections::HashMap;

use chrono::NaiveDateTime;
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorValueRow, NameFilter, NameRepository, Pagination, PeriodRowRepository,
    RepositoryError,
};

use crate::{service_provider::ServiceContext, store_preference::get_store_preferences};

#[derive(Debug, Clone, PartialEq)]
pub struct IndicatorInformation {
    pub column_id: String,
    pub value: String,
}

impl IndicatorInformation {
    fn from_value(value: &IndicatorValueRow) -> Self {
        Self {
            column_id: value.indicator_column_id.clone(),
            value: value.value.clone(),
        }
    }
}
#[derive(Debug, Clone, PartialEq)]
pub struct CustomerIndicatorInformation {
    pub customer_id: String, // customer id
    pub indicator_line_id: String,
    pub datetime: NaiveDateTime,
    pub indicator_information: Vec<IndicatorInformation>,
}

pub fn get_indicator_information(
    ctx: &ServiceContext,
    line_ids: Vec<String>,
    store_id: &str,
    period_id: &str,
) -> Result<Vec<CustomerIndicatorInformation>, RepositoryError> {
    let connection = &ctx.connection;
    let store_preferences = get_store_preferences(connection, store_id)?;

    let customers = NameRepository::new(connection).query(
        store_id,
        Pagination::all(),
        Some(
            NameFilter::new()
                .supplying_store_id(EqualFilter::equal_to(store_id))
                .is_customer(true),
        ),
        None,
    )?;
    if customers.is_empty()
        || (!store_preferences.extra_fields_in_requisition
            && !store_preferences.use_consumption_and_stock_from_customers_for_internal_orders)
    {
        return Ok(vec![]);
    }

    let customer_ids: Vec<String> = customers.iter().map(|c| c.name_row.id.clone()).collect();

    let period = PeriodRowRepository::new(connection).find_one_by_id(period_id)?;

    let period = match period {
        Some(period) => period,
        None => return Ok(vec![]),
    };

    let values = IndicatorValueRepository::new(connection).query_by_filter(
        IndicatorValueFilter::new()
            .store_id(EqualFilter::equal_to(store_id))
            .period_id(EqualFilter::equal_to(period_id))
            .indicator_line_id(EqualFilter::equal_any(line_ids.clone()))
            .customer_name_id(EqualFilter::equal_any(customer_ids.clone())),
    )?;

    let mut result: Vec<CustomerIndicatorInformation> = vec![];

    for line_id in line_ids {
        let line_values = values.iter().filter(|v| v.indicator_line_id == line_id);
        for customer_id in customer_ids.clone() {
            let customer_line_values = line_values
                .clone()
                .filter(|v| v.customer_name_link_id == *customer_id)
                .map(IndicatorInformation::from_value)
                .collect();

            result.push(CustomerIndicatorInformation {
                customer_id,
                indicator_line_id: line_id.clone(),
                datetime: period.end_date.into(),
                indicator_information: sum_values_by_column(customer_line_values),
            })
        }
    }
    Ok(result)
}

fn sum_values_by_column(values: Vec<IndicatorInformation>) -> Vec<IndicatorInformation> {
    let mut summed_values: HashMap<String /* column_id */, String /* value */> = HashMap::new();
    values
        .into_iter()
        .for_each(|IndicatorInformation { column_id, value }| {
            summed_values
                .entry(column_id)
                .and_modify(|value_entry| {
                    *value_entry = match (value.parse::<f64>(), value_entry.parse::<f64>()) {
                        (Ok(one), Ok(two)) => (one + two).to_string(),
                        (Ok(one), Err(_)) => one.to_string(),
                        (Err(_), Ok(two)) => two.to_string(),
                        (Err(_), Err(_)) => value.clone(),
                    }
                })
                .or_insert(value);
        });

    summed_values
        .into_iter()
        .map(|(column_id, value)| IndicatorInformation { column_id, value })
        .collect()
}
