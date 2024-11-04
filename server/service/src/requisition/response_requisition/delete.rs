use repository::{
    requisition_row::{RequisitionStatus, RequisitionType},
    EqualFilter, InvoiceFilter, InvoiceRepository, RepositoryError, RequisitionLineFilter,
    RequisitionLineRepository, RequisitionRowRepository, StorageConnection,
};

use crate::{
    requisition::common::check_requisition_row_exists,
    requisition_line::response_requisition_line::{
        delete_response_requisition_line, DeleteResponseRequisitionLine,
        DeleteResponseRequisitionLineError,
    },
    service_provider::ServiceContext,
};

#[derive(Debug, PartialEq, Clone, Default)]
pub struct DeleteResponseRequisition {
    pub id: String,
}

#[derive(Debug, PartialEq)]

pub enum DeleteResponseRequisitionError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    FinalisedRequisition,
    NotAResponseRequisition,
    TransferRequisition,
    RequisitionWithShipment,
    LineDeleteError {
        line_id: String,
        error: DeleteResponseRequisitionLineError,
    },
    DatabaseError(RepositoryError),
}

type OutError = DeleteResponseRequisitionError;

pub fn delete_response_requisition(
    ctx: &ServiceContext,
    input: DeleteResponseRequisition,
) -> Result<String, OutError> {
    let requisition_id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;

            let lines = RequisitionLineRepository::new(connection).query_by_filter(
                RequisitionLineFilter::new().requisition_id(EqualFilter::equal_to(&input.id)),
            )?;
            for line in lines {
                delete_response_requisition_line(
                    ctx,
                    DeleteResponseRequisitionLine {
                        id: line.requisition_line_row.id.clone(),
                    },
                )
                .map_err(|error| {
                    DeleteResponseRequisitionError::LineDeleteError {
                        line_id: line.requisition_line_row.id,
                        error,
                    }
                })?;
            }

            match RequisitionRowRepository::new(connection).delete(&input.id) {
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
    input: &DeleteResponseRequisition,
) -> Result<(), OutError> {
    let requisition_row = check_requisition_row_exists(connection, &input.id)?
        .ok_or(OutError::RequisitionDoesNotExist)?;

    if requisition_row.store_id != store_id {
        return Err(OutError::NotThisStoreRequisition);
    }

    if requisition_row.r#type != RequisitionType::Response {
        return Err(OutError::NotAResponseRequisition);
    }

    if requisition_row.status == RequisitionStatus::Finalised {
        return Err(OutError::FinalisedRequisition);
    }

    if requisition_row.linked_requisition_id.is_some() {
        return Err(OutError::TransferRequisition);
    }

    let filter = InvoiceFilter {
        requisition_id: Some(EqualFilter::equal_to(&requisition_row.id)),
        ..Default::default()
    };
    if InvoiceRepository::new(connection)
        .query_one(filter)?
        .is_some()
    {
        return Err(OutError::RequisitionWithShipment);
    }

    Ok(())
}

impl From<RepositoryError> for DeleteResponseRequisitionError {
    fn from(error: RepositoryError) -> Self {
        DeleteResponseRequisitionError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_delete {

    use chrono::NaiveDateTime;
    use repository::{
        mock::{
            mock_new_response_requisition, mock_request_draft_requisition,
            mock_sent_request_requisition, mock_store_a, mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, RequisitionRow,
        RequisitionRowRepository, RequisitionStatus, RequisitionType,
    };

    use crate::{
        requisition::response_requisition::{
            DeleteResponseRequisition, DeleteResponseRequisitionError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_response_requisition_errors() {
        let (_, connection, connection_manager, _) =
            setup_all("delete_response_requisition_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;
        let requisition_repo = RequisitionRowRepository::new(&connection);
        let invoice_repo = InvoiceRowRepository::new(&connection);

        // RequisitionDoesNotExist
        assert_eq!(
            service.delete_response_requisition(
                &context,
                DeleteResponseRequisition {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::RequisitionDoesNotExist)
        );

        // NotAResponseRequisition,
        assert_eq!(
            service.delete_response_requisition(
                &context,
                DeleteResponseRequisition {
                    id: mock_sent_request_requisition().id,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // FinalisedRequisition,
        assert_eq!(
            service.delete_response_requisition(
                &context,
                DeleteResponseRequisition {
                    id: mock_request_draft_requisition().id,
                },
            ),
            Err(ServiceError::NotAResponseRequisition)
        );

        // TransferRequisition,
        let transfer_requisition = RequisitionRow {
            id: "transfer_requisition".to_string(),
            requisition_number: 3,
            name_link_id: "name_a".to_string(),
            store_id: mock_store_a().id,
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            linked_requisition_id: Some(mock_sent_request_requisition().id),
            ..Default::default()
        };
        requisition_repo.upsert_one(&transfer_requisition).unwrap();
        assert_eq!(
            service.delete_response_requisition(
                &context,
                DeleteResponseRequisition {
                    id: "transfer_requisition".to_string(),
                },
            ),
            Err(ServiceError::TransferRequisition)
        );

        // RequisitionWithShipment
        let invoice = InvoiceRow {
            id: "invoice_id".to_string(),
            name_link_id: "name_a".to_string(),
            store_id: mock_store_a().id,
            invoice_number: 3,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::New,
            on_hold: false,
            created_datetime: NaiveDateTime::parse_from_str(
                "2021-01-02T00:00:00",
                "%Y-%m-%dT%H:%M:%S",
            )
            .unwrap(),
            currency_rate: 1.0,
            requisition_id: Some(mock_new_response_requisition().id),
            ..Default::default()
        };
        invoice_repo.upsert_one(&invoice).unwrap();
        assert_eq!(
            service.delete_response_requisition(
                &context,
                DeleteResponseRequisition {
                    id: mock_new_response_requisition().id,
                },
            ),
            Err(ServiceError::RequisitionWithShipment)
        );

        // NotThisStoreRequisition
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.delete_response_requisition(
                &context,
                DeleteResponseRequisition {
                    id: mock_new_response_requisition().id,
                },
            ),
            Err(ServiceError::NotThisStoreRequisition)
        );
    }

    #[actix_rt::test]
    async fn delete_response_requisition_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_response_requisition_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.requisition_service;

        let result = service.delete_response_requisition(
            &context,
            DeleteResponseRequisition {
                id: mock_new_response_requisition().id,
            },
        );

        assert_eq!(
            RequisitionRowRepository::new(&connection)
                .find_one_by_id(&result.unwrap())
                .unwrap(),
            None
        )
    }
}
