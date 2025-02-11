use repository::{
    requisition_row::RequisitionType, EqualFilter, InvoiceLineFilter, InvoiceLineRepository,
    RepositoryError, RequisitionLineRowRepository, RequisitionStatus, StorageConnection,
};

use crate::{
    requisition::common::check_requisition_row_exists,
    requisition_line::common::check_requisition_line_exists, service_provider::ServiceContext,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct DeleteResponseRequisitionLine {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteResponseRequisitionLineError {
    RequisitionLineDoesNotExist,
    NotThisStoreRequisition,
    NotAResponseRequisition,
    RequisitionDoesNotExist,
    CannotEditRequisition,
    DatabaseError(RepositoryError),
    CannotDeleteLineFromTransferredRequisition,
    CannotDeleteLineLinkedToShipment,
    InvoiceDoesNotExist,
}

type OutError = DeleteResponseRequisitionLineError;

pub fn delete_response_requisition_line(
    ctx: &ServiceContext,
    input: DeleteResponseRequisitionLine,
) -> Result<String, OutError> {
    ctx.connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            RequisitionLineRowRepository::new(connection)
                .delete(&input.id)
                .map_err(OutError::DatabaseError)
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(input.id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteResponseRequisitionLine,
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

    if requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status == RequisitionStatus::Finalised {
        return Err(OutError::CannotEditRequisition);
    }

    if requisition_row.linked_requisition_id.is_some() {
        return Err(OutError::CannotDeleteLineFromTransferredRequisition);
    }

    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().requisition_id(EqualFilter::equal_to(&requisition_row.id)),
    )?;

    if invoice_lines.iter().any(|invoice_line| {
        requisition_line_row.item_link_id == invoice_line.invoice_line_row.item_link_id
    }) {
        return Err(OutError::CannotDeleteLineLinkedToShipment);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteResponseRequisitionLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteResponseRequisitionLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_full_new_response_requisition_for_update_test,
            mock_request_draft_requisition_calculation_test, mock_store_a, mock_store_b,
            MockDataInserts,
        },
        test_db::setup_all,
        RequisitionLineRowRepository,
    };

    use crate::{
        requisition_line::response_requisition_line::{
            DeleteResponseRequisitionLine, DeleteResponseRequisitionLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_response_requisition_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_response_requisition_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        // RequisitionLineDoesNotExist
        assert_eq!(
            service.delete_response_requisition_line(
                &context,
                DeleteResponseRequisitionLine {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequisitionLineDoesNotExist)
        );

        // NotAResponseRequisition
        assert_eq!(
            service.delete_response_requisition_line(
                &context,
                DeleteResponseRequisitionLine {
                    id: mock_request_draft_requisition_calculation_test().lines[0]
                        .id
                        .clone(),
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.delete_response_requisition_line(
                &context,
                DeleteResponseRequisitionLine {
                    id: mock_full_new_response_requisition_for_update_test().lines[0]
                        .id
                        .clone(),
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn delete_response_requisition_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_response_requisition_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_line_service;

        let test_line = mock_full_new_response_requisition_for_update_test().lines[0].clone();

        service
            .delete_response_requisition_line(
                &context,
                DeleteResponseRequisitionLine {
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
