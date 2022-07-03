use crate::{
    log::log_entry,
    requisition::common::check_requisition_exists,
    requisition_line::request_requisition_line::{
        delete_request_requisition_line, DeleteRequestRequisitionLine,
        DeleteRequestRequisitionLineError,
    },
    service_provider::ServiceContext,
};
use chrono::Utc;
use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    EqualFilter, LogRow, LogType, RepositoryError, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};
use util::uuid::uuid;

#[derive(Debug, PartialEq, Clone, Default)]
pub struct DeleteRequestRequisition {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteRequestRequisitionError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    CannotDeleteRequisitionWithLines,
    NotARequestRequisition,
    LineDeleteError {
        line_id: String,
        error: DeleteRequestRequisitionLineError,
    },
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

            // TODO https://github.com/openmsupply/remote-server/issues/839
            let lines = RequisitionLineRepository::new(&connection).query_by_filter(
                RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(&input.id)),
            )?;
            for line in lines {
                delete_request_requisition_line(
                    ctx,
                    store_id,
                    DeleteRequestRequisitionLine {
                        id: line.requisition_line_row.id.clone(),
                    },
                )
                .map_err(|error| {
                    DeleteRequestRequisitionError::LineDeleteError {
                        line_id: line.requisition_line_row.id,
                        error,
                    }
                })?;
            }
            // End TODO

            match RequisitionRowRepository::new(&connection).delete(&input.id) {
                Ok(_) => Ok(input.id.clone()),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    log_entry(
        &ctx.connection,
        &LogRow {
            id: uuid(),
            r#type: LogType::RequisitionDeleted,
            user_id: None, //TODO
            store_id: Some(store_id.to_string()),
            record_id: Some(input.id),
            datetime: Utc::now().naive_utc(),
        },
    )?;

    Ok(requisition_id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteRequestRequisition,
) -> Result<(), OutError> {
    let requisition_row = check_requisition_exists(connection, &input.id)?
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
    // TODO https://github.com/openmsupply/remote-server/issues/839
    // if !get_lines_for_requisition(connection, &input.id)?.is_empty() {
    //     return Err(OutError::CannotDeleteRequisitionWithLines);
    // }

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
            mock_draft_response_requisition_for_update_test, mock_sent_request_requisition,
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

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.delete_request_requisition(
                &context,
                "store_a",
                DeleteRequestRequisition {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
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
        // TODO https://github.com/openmsupply/remote-server/issues/839
        // CannotDeleteRequisitionWithLines
        // assert_eq!(
        //     service.delete_request_requisition(
        //         &context,
        //         "store_a",
        //         DeleteRequestRequisition {
        //             id: mock_request_draft_requisition_calculation_test()
        //                 .requisition
        //                 .id,
        //         },
        //     ),
        //     Err(ServiceError::CannotDeleteRequisitionWithLines)
        // );
    }

    #[actix_rt::test]
    async fn delete_request_requisition_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_request_requisition_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
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
