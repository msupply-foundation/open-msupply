use repository::{
    indicator_value::{IndicatorValueFilter, IndicatorValueRepository},
    EqualFilter, IndicatorValueRow, IndicatorValueRowRepository, RepositoryError,
    RequisitionStatus, RequisitionType, StorageConnection,
};

use crate::{requisition::common::check_requisition_exists, service_provider::ServiceContext};

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
    NotThisStoreRequisition,
    NotThisStoreValue,
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
    if store_id.to_string() != indicator_value_row.supplier_store_id {
        return Err(OutError::NotThisStoreValue);
    }
    if requisition.requisition_row.store_id != store_id.to_string() {
        return Err(OutError::NotThisStoreRequisition);
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
            if requisition.requisition_row.status != RequisitionStatus::New {
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

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_finalised_response_requisition, mock_indicator_value_a, mock_indicator_value_b,
            mock_new_response_requisition, mock_new_response_requisition_store_b,
            mock_request_draft_requisition, mock_store_a, mock_store_b, mock_user_account_b,
            MockDataInserts,
        },
        test_db::setup_all,
    };
    use util::inline_init;

    use crate::{
        programs::indicator_value::{UpdateIndicatorValue, UpdateIndicatorValueError},
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn update_indicator_value_errors() {
        let (_, _, connection_manager, _) =
            setup_all("update_indicator_value_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.indicator_value_service;

        // IndicatorValueDoesNotExist
        assert_eq!(
            service.update_indicator_value(
                &context,
                inline_init(|r: &mut UpdateIndicatorValue| {
                    r.id = "invalid_id".to_string();
                    r.requisition_id = mock_new_response_requisition().id;
                    r.value = String::from("new value");
                }),
            ),
            Err(UpdateIndicatorValueError::IndicatorValueDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.update_indicator_value(
                &context,
                inline_init(|r: &mut UpdateIndicatorValue| {
                    r.id = mock_indicator_value_a().id;
                    r.requisition_id = mock_finalised_response_requisition().id;
                    r.value = String::from("new value");
                }),
            ),
            Err(UpdateIndicatorValueError::CannotEditRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.update_indicator_value(
                &context,
                inline_init(|r: &mut UpdateIndicatorValue| {
                    r.id = mock_indicator_value_b().id;
                    r.requisition_id = mock_new_response_requisition().id;
                    r.value = String::from("new value");
                }),
            ),
            Err(UpdateIndicatorValueError::NotThisStoreRequisition)
        );

        // NotThisStoreValue
        assert_eq!(
            service.update_indicator_value(
                &context,
                inline_init(|r: &mut UpdateIndicatorValue| {
                    r.id = mock_indicator_value_a().id;
                    r.requisition_id = mock_new_response_requisition_store_b().id;
                    r.value = String::from("new value");
                }),
            ),
            Err(UpdateIndicatorValueError::NotThisStoreValue)
        );
    }

    #[actix_rt::test]
    async fn update_indicator_value_success() {
        let (_, _, connection_manager, _) =
            setup_all("update_indicator_value_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.indicator_value_service;

        service
            .update_indicator_value(
                &context,
                UpdateIndicatorValue {
                    id: mock_indicator_value_a().id,
                    value: "new_test_value".to_string(),
                    requisition_id: mock_request_draft_requisition().id,
                },
            )
            .unwrap();
    }
}
