use crate::{service_provider::ServiceContext, WithDBError};
use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, RepositoryError,
    StockLineRowRepository,
};

mod validate;

use validate::validate;
#[derive(Clone, Debug, PartialEq, Default)]
pub struct DeleteOutboundShipmentLine {
    pub id: String,
}

type OutError = DeleteOutboundShipmentLineError;

pub fn delete_outbound_shipment_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: DeleteOutboundShipmentLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let line = validate(&input, store_id, &connection)?;
            let stock_line_id_option = line.stock_line_id.clone();

            InvoiceLineRowRepository::new(&connection).delete(&line.id)?;

            if let Some(stock_line_id) = stock_line_id_option {
                let invoice_repository = InvoiceRowRepository::new(&connection);
                let stock_line_repository = StockLineRowRepository::new(&connection);

                let mut stock_line = stock_line_repository.find_one_by_id(&stock_line_id)?;
                stock_line.available_number_of_packs += line.number_of_packs;

                let invoice = invoice_repository.find_one_by_id(&line.invoice_id)?;
                if invoice.status == InvoiceRowStatus::Picked {
                    stock_line.total_number_of_packs += line.number_of_packs;
                }

                stock_line_repository.upsert_one(&stock_line)?;
            }

            Ok(line.id) as Result<String, OutError>
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line_id)
}

#[derive(Debug, Clone, PartialEq)]
pub enum DeleteOutboundShipmentLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnOutboundShipment,
    NotThisStoreInvoice,
    CannotEditInvoice,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for DeleteOutboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteOutboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteOutboundShipmentLineError
where
    ERR: Into<DeleteOutboundShipmentLineError>,
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
            mock_inbound_shipment_a_invoice_lines, mock_outbound_shipment_a_invoice_lines,
            mock_outbound_shipment_b_invoice_lines, mock_store_a, mock_store_b, mock_store_c,
            MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };

    use crate::{
        invoice_line::outbound_shipment_line::delete::DeleteOutboundShipmentLine,
        invoice_line::outbound_shipment_line::DeleteOutboundShipmentLineError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_inbound_shipment_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_outbound_shipment_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.delete_outbound_shipment_line(
                &context,
                &mock_store_a().id,
                DeleteOutboundShipmentLine {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotAnOutboundShipment
        assert_eq!(
            service.delete_outbound_shipment_line(
                &context,
                &mock_store_a().id,
                DeleteOutboundShipmentLine {
                    id: mock_inbound_shipment_a_invoice_lines()[0].id.clone(),
                },
            ),
            Err(ServiceError::NotAnOutboundShipment)
        );

        // CannotEditInvoice
        assert_eq!(
            service.delete_outbound_shipment_line(
                &context,
                &mock_store_c().id,
                DeleteOutboundShipmentLine {
                    id: mock_outbound_shipment_b_invoice_lines()[1].id.clone(),
                },
            ),
            Err(ServiceError::CannotEditInvoice)
        );

        //TODO DatabaseError, NotThisStoreInvoice
    }

    #[actix_rt::test]
    async fn delete_outbound_shipment_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_outbound_shipment_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        let invoice_line_id = service
            .delete_outbound_shipment_line(
                &context,
                &mock_store_b().id,
                DeleteOutboundShipmentLine {
                    id: mock_outbound_shipment_a_invoice_lines()[0].id.clone(),
                },
            )
            .unwrap();

        //test entry has been deleted
        assert_eq!(
            InvoiceLineRowRepository::new(&connection)
                .find_one_by_id_option(&invoice_line_id)
                .unwrap(),
            None
        );
    }
}
