use std::collections::HashMap;

use chrono::NaiveDateTime;
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorLineRowRepository, NameFilter, NameRepository, Pagination,
    PeriodRowRepository, RepositoryError,
};

use crate::{
    requisition::common::related_indicator_schema, service_provider::ServiceContext,
    store_preference::get_store_preferences,
};

#[derive(Debug, Clone, PartialEq)]
pub struct IndicatorInformation {
    pub column_id: String,
    pub value: String,
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
                .supplying_store_id(EqualFilter::equal_to(store_id.to_string()))
                .is_customer(true)
                .is_store(true),
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

    // Expand to indicator lines in all programs sharing the same elmis_code so
    // cross-program aggregation works (e.g. CIV CS vs DISTRICT programs).
    let requested_lines =
        IndicatorLineRowRepository::new(connection).find_many_by_ids(&line_ids)?;
    let own_pi_ids: Vec<String> = requested_lines
        .iter()
        .map(|l| l.program_indicator_id.clone())
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    let schema = related_indicator_schema(connection, &own_pi_ids)?;
    let expanded_line_ids: Vec<String> = schema.lines.iter().map(|l| l.id.clone()).collect();

    // Map (header, column_number) -> requested column_id. The frontend joins
    // column values by the requested (district) column_id, so values from
    // customer programs need to be remapped onto the requested IDs.
    // Assumes (header, column_number) is unique within the requesting
    // program's indicator columns — if duplicates exist, the HashMap insert
    // will keep only one column id per key and remapped values will collapse
    // onto the survivor.
    let own_pi_id_set: std::collections::HashSet<&str> =
        own_pi_ids.iter().map(String::as_str).collect();
    let requested_column_key_to_id: HashMap<(String, i32), String> = schema
        .columns
        .iter()
        .filter(|c| own_pi_id_set.contains(c.program_indicator_id.as_str()))
        .map(|c| ((c.header.clone(), c.column_number), c.id.clone()))
        .collect();

    let values = IndicatorValueRepository::new(connection).query_by_filter(
        IndicatorValueFilter::new()
            .store_id(EqualFilter::equal_to(store_id.to_string()))
            .period_id(EqualFilter::equal_to(period_id.to_string()))
            .indicator_line_id(EqualFilter::equal_any(expanded_line_ids))
            .customer_name_id(EqualFilter::equal_any(customer_ids.clone())),
    )?;

    let mut result: Vec<CustomerIndicatorInformation> = vec![];

    let requested_line_code: HashMap<String, String> = requested_lines
        .iter()
        .map(|l| (l.id.clone(), l.code.clone()))
        .collect();

    for line_id in line_ids {
        let Some(line_code) = requested_line_code.get(&line_id) else {
            continue;
        };
        let line_values = values.iter().filter(|v| {
            schema
                .line_id_to_code
                .get(&v.indicator_value_row.indicator_line_id)
                == Some(line_code)
        });
        for customer_id in customer_ids.clone() {
            let customer_line_values: Vec<IndicatorInformation> = line_values
                .clone()
                .filter(|v| v.name_row.id == *customer_id)
                .filter_map(|v| {
                    let key = schema
                        .column_id_to_key
                        .get(&v.indicator_value_row.indicator_column_id)?;
                    let requested_column_id = requested_column_key_to_id.get(key)?.clone();
                    Some(IndicatorInformation {
                        column_id: requested_column_id,
                        value: v.indicator_value_row.value.clone(),
                    })
                })
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
