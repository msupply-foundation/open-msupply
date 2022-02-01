use crate::{
    requisition::common::{check_requisition_exists, get_lines_for_requisition},
    service_provider::ServiceContext,
};
use repository::{
    schema::{RequisitionRowStatus, RequisitionRowType},
    RepositoryError, RequisitionRowRepository, StorageConnection,
};

pub struct DeleteRequestRequisition {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteRequestRequisitionError {
    RequistionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    CannotDeleteRequistionWithLines,
    NotARequestRequisition,
    DatabaseError(RepositoryError),
}

type OutError = DeleteRequestRequisitionError;

pub fn delete_request_requisition(
    ctx: &ServiceContext,
    store_id: &str,
    input: DeleteRequestRequisition,
) -> Result<String, OutError> {
    let requisition_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, store_id, &input)?;
            match RequisitionRowRepository::new(&connection).delete(&input.id) {
                Ok(_) => Ok(input.id),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(requisition_id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteRequestRequisition,
) -> Result<(), OutError> {
    let requisition_row =
        check_requisition_exists(connection, &input.id)?.ok_or(OutError::RequistionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.status != RequisitionRowStatus::Draft {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.r#type != RequisitionRowType::Request {
        return Err(OutError::NotARequestRequisition);
    }

    if !get_lines_for_requisition(connection, &input.id)?.is_empty() {
        return Err(OutError::CannotDeleteRequistionWithLines);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteRequestRequisitionError {
    fn from(error: RepositoryError) -> Self {
        DeleteRequestRequisitionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_delete {

    use repository::{
        mock::{
            mock_draft_request_requisition_for_update_test,
            mock_draft_response_requisition_for_update_test,
            mock_request_draft_requisition_calculation_test, mock_sent_request_requisition,
            MockDataInserts,
        },
        test_db::setup_all,
        RequisitionRowRepository,
    };

    use crate::{
        requisition::request_requisition::{
            DeleteRequestRequisition, DeleteRequestRequisitionError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_request_requisition_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_request_requisition_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequistionDoesNotExist
        assert_eq!(
            service.delete_request_requisition(
                &context,
                "store_a",
                DeleteRequestRequisition {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequistionDoesNotExist)
        );

        // NotThisStoreRequisition
        assert_eq!(
            service.delete_request_requisition(
                &context,
                "store_b",
                DeleteRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );

        // CannotEditRequisition
        assert_eq!(
            service.delete_request_requisition(
                &context,
                "store_a",
                DeleteRequestRequisition {
                    id: mock_sent_request_requisition().id,
                },
            ),
            Err(ServiceError::CannotEditRequisition)
        );

        // NotARequestRequisition
        assert_eq!(
            service.delete_request_requisition(
                &context,
                "store_a",
                DeleteRequestRequisition {
                    id: mock_draft_response_requisition_for_update_test().id,
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );

        // CannotDeleteRequistionWithLines
        assert_eq!(
            service.delete_request_requisition(
                &context,
                "store_a",
                DeleteRequestRequisition {
                    id: mock_request_draft_requisition_calculation_test()
                        .requisition
                        .id,
                },
            ),
            Err(ServiceError::CannotDeleteRequistionWithLines)
        );
    }

    #[actix_rt::test]
    async fn delete_request_requisition_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_request_requisition_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .delete_request_requisition(
                &context,
                "store_a",
                DeleteRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                },
            )
            .unwrap();

        assert_eq!(
            RequisitionRowRepository::new(&connection)
                .find_one_by_id(&result)
                .unwrap(),
            None
        )
    }
}
