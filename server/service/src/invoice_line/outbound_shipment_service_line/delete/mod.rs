use crate::{
    invoice_line::DeleteOutboundShipmentLine, service_provider::ServiceContext, WithDBError,
};
use repository::{InvoiceLineRowRepository, RepositoryError};

mod validate;

use validate::validate;

type OutError = DeleteOutboundShipmentServiceLineError;

pub fn delete_outbound_shipment_service_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: DeleteOutboundShipmentLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let line = validate(&input, &connection)?;
            InvoiceLineRowRepository::new(&connection).delete(&line.id)?;

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
            mock_draft_inbound_service_line, mock_draft_inbound_shipment_with_service_lines,
            mock_draft_outbound_service_line, mock_draft_outbound_shipped_service_line,
            mock_draft_outbound_shipped_with_service_lines, mock_draft_outbound_with_service_lines,
            mock_full_draft_outbound_shipment_a, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        invoice_line::outbound_shipment_line::DeleteOutboundShipmentLine,
        service_provider::ServiceProvider,
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
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        let draft_shipment = mock_full_draft_outbound_shipment_a();

        // LineDoesNotExist
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteOutboundShipmentLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // InvoiceDoesNotExist
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteOutboundShipmentLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.invoice_id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::InvoiceDoesNotExist)
        );

        // NotAnOutboundShipment
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteOutboundShipmentLine| {
                    r.invoice_id = mock_draft_inbound_shipment_with_service_lines().id;
                    r.id = mock_draft_inbound_service_line().id;
                }),
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // NotThisInvoiceLine
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteOutboundShipmentLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.invoice_id = draft_shipment.invoice.id.clone();
                }),
            ),
            Err(ServiceError::NotThisInvoiceLine(
                mock_draft_outbound_with_service_lines().id
            ))
        );

        // CannotEditInvoice
        assert_eq!(
            service.delete_outbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteOutboundShipmentLine| {
                    r.id = mock_draft_outbound_shipped_service_line().id;
                    r.invoice_id = mock_draft_outbound_shipped_with_service_lines().id;
                }),
            ),
            Err(ServiceError::CannotEditInvoice)
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
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        service
            .delete_outbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteOutboundShipmentLine| {
                    r.id = mock_draft_outbound_service_line().id;
                    r.invoice_id = mock_draft_outbound_with_service_lines().id;
                }),
            )
            .unwrap();

        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id_option(&mock_draft_outbound_service_line().id)
                .unwrap(),
            None
        );
    }
}
