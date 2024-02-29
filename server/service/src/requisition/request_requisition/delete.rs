use crate::{
    activity_log::activity_log_entry,
    requisition::common::check_requisition_row_exists,
    requisition_line::request_requisition_line::{
        delete_request_requisition_line, DeleteRequestRequisitionLine,
        DeleteRequestRequisitionLineError,
    },
    service_provider::ServiceContext,
};
use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    ActivityLogType, EqualFilter, RepositoryError, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};

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
    input: DeleteRequestRequisition,
) -> Result<String, OutError> {
    let requisition_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            // Note that lines are not deleted when an invoice is deleted, due to issues with batch deletes.
            // TODO: implement delete lines. See https://github.com/openmsupply/remote-server/issues/839 for details.
            let lines = RequisitionLineRepository::new(&connection).query_by_filter(
                RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(&input.id)),
            )?;
            for line in lines {
                delete_request_requisition_line(
                    ctx,
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
            activity_log_entry(
                &ctx,
                ActivityLogType::RequisitionDeleted,
                Some(input.id.to_owned()),
                None,
                None,
            )?;

            match RequisitionRowRepository::new(&connection).delete(&input.id) {
                Ok(_) => Ok(input.id.clone()),
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
    let requisition_row = check_requisition_row_exists(connection, &input.id)?
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
    // Note that lines are not deleted when an invoice is deleted, due to issues with batch deletes.
    // TODO: implement delete lines. See https://github.com/openmsupply/remote-server/issues/839 for details.
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
            mock_full_draft_response_requisition_for_update_test, mock_sent_request_requisition,
            mock_store_a, mock_store_b, MockDataInserts,
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
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        // RequisitionDoesNotExist
        assert_eq!(
            service.delete_request_requisition(
                &context,
                DeleteRequestRequisition {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // CannotEditRequisition
        assert_eq!(
            service.delete_request_requisition(
                &context,
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
                DeleteRequestRequisition {
                    id: mock_full_draft_response_requisition_for_update_test()
                        .requisition
                        .id,
                },
            ),
            Err(ServiceError::NotARequestRequisition)
        );
        // Note that lines are not deleted when an invoice is deleted, due to issues with batch deletes.
        // TODO: implement delete lines. See https://github.com/openmsupply/remote-server/issues/839 for details.
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

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.delete_request_requisition(
                &context,
                DeleteRequestRequisition {
                    id: mock_draft_request_requisition_for_update_test().id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn delete_request_requisition_success() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_request_requisition_success", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let result = service
            .delete_request_requisition(
                &context,
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
