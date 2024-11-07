use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorValueRow, IndicatorValueRowRepository, RepositoryError,
    StorageConnection,
};

use crate::service_provider::ServiceContext;

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateIndicatorValue {
    pub id: String,
    pub value: String,
}

#[derive(Debug, PartialEq)]
pub enum UpdateIndicatorValueError {
    DatabaseError(RepositoryError),
    IndicatorValueDoesNotExist,
}

type OutError = UpdateIndicatorValueError;

pub fn update_indicator_value(
    ctx: &ServiceContext,
    input: UpdateIndicatorValue,
) -> Result<IndicatorValueRow, OutError> {
    // let indicator_value = ctx.connection.transaction
    let indicator_value = ctx
        .connection
        .transaction_sync(|connection| {
            let indicator_value_row = validate(connection, &input)?;

            let updated_row = generate(indicator_value_row, input);

            IndicatorValueRowRepository::new(connection).upsert_one(&updated_row)?;

            IndicatorValueRepository::new(connection)
                .query_one(IndicatorValueFilter::new().id(EqualFilter::equal_to(&updated_row.id)))
                .map_err(OutError::DatabaseError)?
                .ok_or(OutError::IndicatorValueDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(indicator_value)
}

fn validate(
    connection: &StorageConnection,
    input: &UpdateIndicatorValue,
) -> Result<IndicatorValueRow, OutError> {
    let indicator_value_row = check_indicator_value_exists(connection, &input.id)?
        .ok_or(OutError::IndicatorValueDoesNotExist)?;

    // TODO add validations as per requisition

    Ok(indicator_value_row)
}

fn check_indicator_value_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<IndicatorValueRow>, RepositoryError> {
    IndicatorValueRepository::new(connection)
        .query_one(IndicatorValueFilter::new().id(EqualFilter::equal_to(id)))
}

fn generate(
    indicator_value_row: IndicatorValueRow,
    input: UpdateIndicatorValue,
) -> IndicatorValueRow {
    IndicatorValueRow {
        id: indicator_value_row.id,
        customer_name_link_id: indicator_value_row.customer_name_link_id,
        supplier_store_id: indicator_value_row.supplier_store_id,
        period_id: indicator_value_row.period_id,
        indicator_line_id: indicator_value_row.indicator_line_id,
        indicator_column_id: indicator_value_row.indicator_column_id,
        value: input.value,
    }
}

impl From<RepositoryError> for UpdateIndicatorValueError {
    fn from(error: RepositoryError) -> Self {
        UpdateIndicatorValueError::DatabaseError(error)
    }
}
