use crate::{invoice_line::DeleteStockOutLine, service_provider::ServiceContext, WithDBError};
use repository::{InvoiceLineRowRepository, RepositoryError};

mod validate;

use validate::validate;

type OutError = DeleteOutboundShipmentServiceLineError;

pub fn delete_outbound_shipment_service_line(
    ctx: &ServiceContext,
    input: DeleteStockOutLine,
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
pub enum DeleteOutboundShipmentServiceLineError {
    LineDoesNotExist,
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    CannotEditInvoice,
    NotThisInvoiceLine(String),
    NotThisStoreInvoice,
    // Internal
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for DeleteOutboundShipmentServiceLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteOutboundShipmentServiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteOutboundShipmentServiceLineError
where
    ERR: Into<DeleteOutboundShipmentServiceLineError>,
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
            mock_draft_inbound_service_line, mock_draft_outbound_service_line,
            mock_draft_outbound_shipped_service_line, mock_store_a, mock_store_b, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        invoice_line::stock_out_line::delete::DeleteStockOutLine, service_provider::ServiceProvider,
    };

    use super::DeleteOutboundShipmentServiceLineError;

    type ServiceError = DeleteOutboundShipmentServiceLineError;

    #[actix_rt::test]
    async fn delete_outbound_shipment_service_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_outbound_shipment_service_line_errors",
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
            service.delete_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockOutLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotAnOutboundShipment
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockOutLine| {
                    r.id = mock_draft_inbound_service_line().id;
                }),
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // CannotEditInvoice
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockOutLine| {
                    r.id = mock_draft_outbound_shipped_service_line().id;
                }),
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        context.store_id = mock_store_b().id;
        // NotThisStoreInvoice
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockOutLine| {
                    r.id = mock_draft_outbound_service_line().id;
                }),
            ),
            Err(ServiceError::NotThisStoreInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_outbound_shipment_service_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_outbound_shipment_service_line_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider
            .context(mock_store_a().id, "".to_string())
            .unwrap();
        let service = service_provider.invoice_line_service;

        service
            .delete_outbound_shipment_service_line(
                &context,
                inline_init(|r: &mut DeleteStockOutLine| {
                    r.id = mock_draft_outbound_service_line().id;
                }),
            )
            .unwrap();

        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id(&mock_draft_outbound_service_line().id)
                .unwrap(),
            None
        );
    }
}
