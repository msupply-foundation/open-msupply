use crate::{
    requisition::common::check_requisition_row_exists,
    requisition_line::common::check_requisition_line_exists, service_provider::ServiceContext,
};
use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionLineRowRepository, StorageConnection,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct DeleteRequestRequisitionLine {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteRequestRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotARequestRequisition,
    RequisitionDoesNotExist,
    DatabaseError(RepositoryError),
}

type OutError = DeleteRequestRequisitionLineError;

pub fn delete_request_requisition_line(
    ctx: &ServiceContext,
    input: DeleteRequestRequisitionLine,
) -> Result<String, OutError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            RequisitionLineRowRepository::new(&connection)
                .delete(&input.id)
                .map_err(|error| OutError::DatabaseError(error))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(input.id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteRequestRequisitionLine,
) -> Result<(), OutError> {
    let requisition_line_row = check_requisition_line_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionLineDoesNotExist)?
        .requisition_line_row;

    let requisition_row =
        check_requisition_row_exists(connection, &requisition_line_row.requisition_id)?
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

impl From<RepositoryError> for DeleteRequestRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteRequestRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_full_draft_response_requisition_for_update_test,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition_line,
            mock_store_a, mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository,
    };

    use crate::{
        requisition_line::request_requisition_line::{
            DeleteRequestRequisitionLine, DeleteRequestRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_request_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_request_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.delete_request_requisition_line(
                &context,
                DeleteRequestRequisitionLine {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.delete_request_requisition_line(
                &context,
                DeleteRequestRequisitionLine {
                    id: mock_sent_request_requisition_line().id,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.delete_request_requisition_line(
                &context,
                DeleteRequestRequisitionLine {
                    id: mock_full_draft_response_requisition_for_update_test().lines[0]
                        .id
                        .clone(),
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.delete_request_requisition_line(
                &context,
                DeleteRequestRequisitionLine {
                    id: mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone(),
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn delete_request_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_request_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        let test_line = mock_request_draft_requisition_calculation_test().lines[0].clone();

        service
            .delete_request_requisition_line(
                &context,
                DeleteRequestRequisitionLine {
                    id: test_line.id.clone(),
                },
            )
            .unwrap();

        assert_eq!(
            RequisitionLineRowRepository::new(&connection)
                .find_one_by_id(&test_line.id)
                .unwrap(),
            None
        );
    }
}
