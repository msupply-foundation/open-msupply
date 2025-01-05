use chrono::NaiveDateTime;
use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, NameFilter, NameRepository, Pagination, PeriodRowRepository,
    ProgramIndicatorFilter, RepositoryError,
};

use crate::{
    requisition::program_indicator::query::program_indicators, service_provider::ServiceContext,
    store_preference::get_store_preferences,
};

#[derive(Debug, Clone, PartialEq)]
pub struct IndicatorInformation {
    pub column_id: String,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct CustomerIndicatorInformation {
    pub id: String, // customer id
    pub indicator_line_id: String,
    pub datetime: NaiveDateTime,
    pub indicator_information: Vec<IndicatorInformation>,
}

pub fn get_indicator_information(
    ctx: &ServiceContext,
    store_id: &str,
    period_id: &str,
    program_id: &str,
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

    let program_indicators = program_indicators(
        connection,
        Pagination::all(),
        None,
        Some(ProgramIndicatorFilter::new().program_id(EqualFilter::equal_to(program_id))),
    )?;
    let period = PeriodRowRepository::new(connection).find_one_by_id(period_id)?;

    let period = match period {
        Some(period) => period,
        None => return Ok(vec![]),
    };

    let mut indicator_values = vec![];

    for program_indicator in program_indicators {
        let indicator_line_ids: Vec<String> = program_indicator
            .lines
            .iter()
            .map(|line| line.line.id.clone())
            .collect();

        let column_ids: Vec<String> = program_indicator
            .lines
            .iter()
            .flat_map(|line| line.columns.iter().map(|column| column.id.clone()))
            .collect();

        let values = IndicatorValueRepository::new(connection).query_by_filter(
            IndicatorValueFilter::new()
                .store_id(EqualFilter::equal_to(store_id))
                .period_id(EqualFilter::equal_to(period_id))
                .indicator_line_id(EqualFilter::equal_any(indicator_line_ids.clone()))
                .indicator_column_id(EqualFilter::equal_any(column_ids.clone()))
                .customer_name_link_id(EqualFilter::equal_any(customer_ids.clone())),
        )?;

        let customers_without_values: Vec<String> = customers
            .iter()
            .map(|c| c.name_row.id.clone())
            .filter(|c| !values.iter().any(|v| v.customer_name_link_id == *c))
            .collect();

        for value in values {
            indicator_values.push(CustomerIndicatorInformation {
                id: value.customer_name_link_id.clone(),
                indicator_line_id: value.indicator_line_id.clone(),
                datetime: period.end_date.into(),
                indicator_information: vec![IndicatorInformation {
                    column_id: value.indicator_column_id.clone(),
                    value: value.value,
                }],
            });
        }
        for customer_id in customers_without_values {
            for line in program_indicator.lines.iter() {
                let mut indicator_information = vec![];
                for column in line.columns.iter() {
                    indicator_information.push(IndicatorInformation {
                        column_id: column.id.clone(),
                        value: "".to_string(),
                    });
                }
                indicator_values.push(CustomerIndicatorInformation {
                    id: customer_id.clone(),
                    indicator_line_id: line.line.id.clone(),
                    datetime: period.end_date.into(),
                    indicator_information,
                });
            }
        }
    }

    Ok(indicator_values)
}
