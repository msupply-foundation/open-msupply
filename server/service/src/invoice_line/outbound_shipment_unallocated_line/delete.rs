use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, RepositoryError,
    StorageConnection,
};

use crate::{
    invoice::{check_invoice_exists, check_store},
    invoice_line::validate::check_line_row_exists_option,
    service_provider::ServiceContext,
};

#[derive(Clone, Debug, PartialEq, Default)]
pub struct DeleteOutboundShipmentUnallocatedLine {
    pub id: String,
}

#[derive(Debug, PartialEq, Clone)]
pub enum DeleteOutboundShipmentUnallocatedLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    LineIsNotUnallocatedLine,
    InvoiceDoesNotExist,
    NotThisStoreInvoice,
}

type OutError = DeleteOutboundShipmentUnallocatedLineError;

pub fn delete_outbound_shipment_unallocated_line(
    ctx: &ServiceContext,
    input: DeleteOutboundShipmentUnallocatedLine,
) -> Result<String, OutError> {
    let id = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &ctx.store_id, &input)?;
            match InvoiceLineRowRepository::new(connection).delete(&input.id) {
                Ok(_) => Ok(input.id),
                Err(error) => Err(OutError::DatabaseError(error)),
            }
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(id)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &DeleteOutboundShipmentUnallocatedLine,
) -> Result<InvoiceLineRow, OutError> {
    let invoice_line =
        check_line_row_exists_option(connection, &input.id)?.ok_or(OutError::LineDoesNotExist)?;

    if invoice_line.r#type != InvoiceLineRowType::UnallocatedStock {
        return Err(OutError::LineIsNotUnallocatedLine);
    }

    let invoice = check_invoice_exists(&invoice_line.invoice_id, connection)?
        .ok_or(OutError::InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(OutError::NotThisStoreInvoice);
    }

    Ok(invoice_line)
}

impl From<RepositoryError> for DeleteOutboundShipmentUnallocatedLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteOutboundShipmentUnallocatedLineError::DatabaseError(error)
    }
}

#[cfg(test)]
mod test_delete {
    use repository::{
        mock::{
            mock_outbound_shipment_a_invoice_lines, mock_store_a, mock_store_c,
            mock_unallocated_line, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository, RepositoryError,
    };

    use crate::{
        invoice_line::{
            DeleteOutboundShipmentUnallocatedLine,
            DeleteOutboundShipmentUnallocatedLineError as ServiceError,
        },
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_unallocated_line_errors() {
        let (_, _, connection_manager, _) =
            setup_all("delete_unallocated_line_errors", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // Line Does not Exist
        assert_eq!(
            service.delete_outbound_shipment_unallocated_line(
                &context,
                DeleteOutboundShipmentUnallocatedLine {
                    id: "invalid".to_owned()
                },
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // LineIsNotUnallocatedLine
        assert_eq!(
            service.delete_outbound_shipment_unallocated_line(
                &context,
                DeleteOutboundShipmentUnallocatedLine {
                    id: mock_outbound_shipment_a_invoice_lines()[0].id.clone(),
                },
            ),
            Err(ServiceError::LineIsNotUnallocatedLine)
        );

        // NotThisStoreInvoice
        assert_eq!(
            service.delete_outbound_shipment_unallocated_line(
                &context,
                DeleteOutboundShipmentUnallocatedLine {
                    id: mock_unallocated_line().id.clone(),
                },
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_unallocated_line_success() {
        let (_, _, connection_manager, _) =
            setup_all("delete_unallocated_line_success", MockDataInserts::all()).await;

        let connection = connection_manager.connection().unwrap();
        let service_provider = ServiceProvider::new(connection_manager.clone(), "app_data");
        let context = service_provider
            .context(mock_store_c().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        let mut line_to_delete = mock_unallocated_line();
        // Succesfull delete
        let result = service
            .delete_outbound_shipment_unallocated_line(
                &context,
                DeleteOutboundShipmentUnallocatedLine {
                    id: line_to_delete.id.clone(),
                },
            )
            .unwrap();

        assert_eq!(result, line_to_delete.id);
        line_to_delete.number_of_packs = 20.0;
        assert_eq!(
            InvoiceLineRowRepository::new(&connection).find_one_by_id_old(&result),
            Err(RepositoryError::NotFound)
        )
    }
}
