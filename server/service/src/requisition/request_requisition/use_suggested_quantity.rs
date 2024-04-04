use crate::{
    requisition::common::{check_requisition_row_exists, get_lines_for_requisition},
    service_provider::ServiceContext,
};
use repository::EqualFilter;
use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionLine, RequisitionLineFilter, RequisitionLineRepository,
    RequisitionLineRow, RequisitionLineRowRepository, StorageConnection,
};

#[derive(Debug, PartialEq)]
pub struct UseSuggestedQuantity {
    pub request_requisition_id: String,
}

#[derive(Debug, PartialEq)]

pub enum UseSuggestedQuantityError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    DatabaseError(RepositoryError),
}

type OutError = UseSuggestedQuantityError;

pub fn use_suggested_quantity(
    ctx: &ServiceContext,
    input: UseSuggestedQuantity,
) -> Result<Vec<RequisitionLine>, OutError> {
    let requisition_lines = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            let update_requisition_line_rows = generate(connection, &input.request_requisition_id)?;

            let requisition_line_row_repository = RequisitionLineRowRepository::new(&connection);

            for requisition_line_row in update_requisition_line_rows {
                requisition_line_row_repository.upsert_one(&requisition_line_row)?;
            }

            match RequisitionLineRepository::new(connection).query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(&input.request_requisition_id)),
            ) {
                Ok(lines) => Ok(lines),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(requisition_lines)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UseSuggestedQuantity,
) -> Result<(), OutError> {
    let requisition_row = check_requisition_row_exists(connection, &input.request_requisition_id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Request {
        return Err(OutError::NotARequestRequisition);
    }
    Ok(())
}

fn generate(
    connection: &StorageConnection,
    requisition_id: &str,
) -> Result<Vec<RequisitionLineRow>, RepositoryError> {
    let lines = get_lines_for_requisition(connection, requisition_id)?;

    let result = lines
        .into_iter()
        .map(
            |RequisitionLine {
                 mut requisition_line_row,
                 ..
             }| {
                requisition_line_row.requested_quantity = requisition_line_row.suggested_quantity;

                requisition_line_row
            },
        )
        .collect();

    Ok(result)
}

impl From<RepositoryError> for UseSuggestedQuantityError {
    fn from(error: RepositoryError) -> Self {
        UseSuggestedQuantityError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_full_draft_response_requisition_for_update_test,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition,
            mock_store_a, mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
    };

    use crate::{
        requisition::{
            common::get_lines_for_requisition,
            request_requisition::{
                UseSuggestedQuantity, UseSuggestedQuantityError as ServiceError,
            },
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn use_suggested_quantity_errors() {
        let (_, _, connection_manager, _) =
            setup_all("use_suggested_quantity_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.use_suggested_quantity(
                &context,
                UseSuggestedQuantity {
                    request_requisition_id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.use_suggested_quantity(
                &context,
                UseSuggestedQuantity {
                    request_requisition_id: mock_sent_request_requisition().id,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.use_suggested_quantity(
                &context,
                UseSuggestedQuantity {
                    request_requisition_id: mock_full_draft_response_requisition_for_update_test()
                        .requisition
                        .id,
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.use_suggested_quantity(
                &context,
                UseSuggestedQuantity {
                    request_requisition_id: mock_draft_request_requisition_for_update_test().id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn use_suggested_quantity_success() {
        let (_, connection, connection_manager, _) =
            setup_all("use_suggested_quantity_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .use_suggested_quantity(
                &context,
                UseSuggestedQuantity {
                    request_requisition_id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                },
            )
            .unwrap();

        let lines = get_lines_for_requisition(
            &connection,
            &mock_request_draft_requisition_calculation_test()
                .requisition
                .id,
        )
        .unwrap();

        assert_eq!(result, lines);

        for requisition_line in lines {
            assert_eq!(
                requisition_line.requisition_line_row.requested_quantity,
                requisition_line.requisition_line_row.suggested_quantity
            )
        }
    }
}
