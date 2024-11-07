use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    requisition_row, EqualFilter, IndicatorValueRow, IndicatorValueRowRepository, RepositoryError,
    RequisitionStatus, RequisitionType, StorageConnection,
};

use crate::{
    requisition::common::{check_approval_status, check_requisition_exists},
    service_provider::ServiceContext,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct UpdateIndicatorValue {
    pub id: String,
    pub value: String,
    pub requisition_id: String,
}

#[derive(Debug, PartialEq)]
pub enum UpdateIndicatorValueError {
    DatabaseError(RepositoryError),
    IndicatorValueDoesNotExist,
    NoRequisitionForIndicator,
    ValueNotOfUsersStore,
    RequisitionOfDifferentStore,
    RequisitionHasNoPeriod,
    ValuePeriodNotRequisitionPeriod,
    CannotEditRequisition,
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
            let indicator_value_row = validate(connection, &input, &ctx.store_id)?;

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
    store_id: &String,
) -> Result<IndicatorValueRow, OutError> {
    let indicator_value_row = check_indicator_value_exists(connection, &input.id)?
        .ok_or(OutError::IndicatorValueDoesNotExist)?;

    let requisition = check_requisition_exists(connection, &input.requisition_id)?
        .ok_or(OutError::NoRequisitionForIndicator)?;

    // todo rename to store_id as it is store_id
    if store_id.to_owned() != indicator_value_row.supplier_store_id {
        return Err(OutError::ValueNotOfUsersStore);
    }

    if requisition.requisition_row.store_id != store_id.to_owned() {
        return Err(OutError::RequisitionOfDifferentStore);
    }

    match requisition.period {
        Some(period) => {
            if period.id != indicator_value_row.period_id {
                return Err(OutError::ValuePeriodNotRequisitionPeriod);
            }
        }
        None => return Err(OutError::RequisitionHasNoPeriod),
    }

    match requisition.requisition_row.r#type {
        RequisitionType::Response => {
            if check_approval_status(&requisition.requisition_row) {
                return Err(OutError::CannotEditRequisition);
            }
        }
        RequisitionType::Request => {
            if requisition.requisition_row.status != RequisitionStatus::Draft {
                return Err(OutError::CannotEditRequisition);
            }
        }
    }

    Ok(indicator_value_row)
}

fn check_indicator_value_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<IndicatorValueRow>, RepositoryError> {
    Ok(IndicatorValueRepository::new(connection)
        .query_one(IndicatorValueFilter::new().id(EqualFilter::equal_to(id)))?)
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
