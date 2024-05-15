use crate::{
    invoice_line::stock_in_line::DeleteStockInLine, service_provider::ServiceContext, WithDBError,
};
use repository::{InvoiceLineRowRepository, RepositoryError};

mod validate;

use validate::validate;

type OutError = DeleteInboundShipmentServiceLineError;

pub fn delete_inbound_shipment_service_line(
    ctx: &ServiceContext,
    input: DeleteStockInLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let line = validate(&input, &ctx.store_id, connection)?;
            InvoiceLineRowRepository::new(connection).delete(&line.id)?;

            Ok(line.id) as Result<String, OutError>
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line_id)
}

#[derive(Debug, PartialEq)]
pub enum DeleteInboundShipmentServiceLineError {
    LineDoesNotExist,
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    CannotEditInvoice,
    NotThisInvoiceLine(String),
    NotThisStoreInvoice,
    // Internal
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteInboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteInboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteInboundShipmentServiceLineError
where
    ERR: Into<DeleteInboundShipmentServiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}

#[cfg(test)]
mod test {
    use repository::{
        mock::{
            mock_draft_inbound_service_line, mock_draft_inbound_verified_service_line,
            mock_draft_outbound_service_line, mock_store_a, mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        invoice_line::stock_in_line::DeleteStockInLine, service_provider::ServiceProvider,
    };

    use super::DeleteInboundShipmentServiceLineError;

    type ServiceError = DeleteInboundShipmentServiceLineError;

    #[actix_rt::test]
    async fn delete_inbound_shipment_service_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_inbound_shipment_service_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let mut context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.delete_inbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockInLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotAnInboundShipment
        assert_eq!(
            service.delete_inbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockInLine| {
                    r.id = mock_draft_outbound_service_line().id;
                }),
            ),
            Err(ServiceError::NotAnInboundShipment)
        );

        // CannotEditInvoice
        assert_eq!(
            service.delete_inbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockInLine| {
                    r.id = mock_draft_inbound_verified_service_line().id;
                }),
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        // NotThisStoreInvoice
        context.store_id = mock_store_b().id;
        assert_eq!(
            service.delete_inbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockInLine| {
                    r.id = mock_draft_inbound_service_line().id;
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_inbound_shipment_service_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_inbound_shipment_service_line_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        service
            .delete_inbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockInLine| {
                    r.id = mock_draft_inbound_service_line().id;
                }),
            )
            .unwrap();

        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id_option(&mock_draft_inbound_service_line().id)
                .unwrap(),
            None
        );
    }
}
