use crate::{
    invoice_line::DeleteInboundShipmentLine, service_provider::ServiceContext, WithDBError,
};
use repository::{InvoiceLineRowRepository, RepositoryError};

mod validate;

use validate::validate;

type OutError = DeleteInboundShipmentServiceLineError;

pub fn delete_inbound_shipment_service_line(
    ctx: &ServiceContext,
    _store_id: &str,
    input: DeleteInboundShipmentLine,
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
pub enum DeleteInboundShipmentServiceLineError {
    LineDoesNotExist,
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    CannotEditInvoice,
    NotThisInvoiceLine(String),
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
            mock_draft_outbound_service_line, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };
    use util::inline_init;

    use crate::{
        invoice_line::inbound_shipment_line::DeleteInboundShipmentLine,
        service_provider::ServiceProvider,
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

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.delete_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteInboundShipmentLine| {
                    r.id = "invalid".to_string();
                }),
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // InvoiceDoesNotExist
        // assert_eq!(
        //     service.delete_inbound_shipment_service_line(
        //         &context,
        //         "store_a",
        //         inline_init(|r: &mut DeleteInboundShipmentLine| {
        //             r.id = mock_draft_inbound_service_line().id;
        //         }),
        //     ),
        //     Err(ServiceError::InvoiceDoesNotExist)
        // );

        // NotAnInboundShipment
        assert_eq!(
            service.delete_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteInboundShipmentLine| {
                    r.id = mock_draft_outbound_service_line().id;
                }),
            ),
            Err(ServiceError::NotAnInboundShipment)
        );

        // NotThisInvoiceLine
        // assert_eq!(
        //     service.delete_inbound_shipment_service_line(
        //         &context,
        //         "store_a",
        //         inline_init(|r: &mut DeleteInboundShipmentLine| {
        //             r.id = mock_draft_inbound_service_line().id;
        //         }),
        //     ),
        //     Err(ServiceError::NotThisInvoiceLine(
        //         mock_draft_inbound_shipment_with_service_lines().id
        //     ))
        // );

        // CannotEditInvoice
        assert_eq!(
            service.delete_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteInboundShipmentLine| {
                    r.id = mock_draft_inbound_verified_service_line().id;
                }),
            ),
            Err(ServiceError::CannotEditInvoice)
        );
    }

    #[actix_rt::test]
    async fn delete_inbound_shipment_service_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_inbound_shipment_service_line_service",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        service
            .delete_inbound_shipment_service_line(
                &context,
                "store_a",
                inline_init(|r: &mut DeleteInboundShipmentLine| {
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
