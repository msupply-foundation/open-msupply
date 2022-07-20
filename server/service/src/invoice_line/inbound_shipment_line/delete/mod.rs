use crate::{
    invoice::common::generate_invoice_user_id_update, service_provider::ServiceContext, WithDBError,
};
use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, RepositoryError, StockLineRowRepository,
};

mod validate;

use validate::validate;

#[derive(Clone, Debug, PartialEq, Default)]
pub struct DeleteInboundShipmentLine {
    pub id: String,
}

type OutError = DeleteInboundShipmentLineError;

pub fn delete_inbound_shipment_line(
    ctx: &ServiceContext,
    _store_id: &str,
    user_id: &str,
    input: DeleteInboundShipmentLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let (invoice_row, line) = validate(&input, &connection)?;

            let delete_batch_id_option = line.stock_line_id.clone();

            InvoiceLineRowRepository::new(&connection).delete(&line.id)?;

            if let Some(id) = delete_batch_id_option {
                StockLineRowRepository::new(&connection).delete(&id)?;
            }

            if let Some(invoice_row) = generate_invoice_user_id_update(user_id, invoice_row) {
                InvoiceRowRepository::new(&connection).upsert_one(&invoice_row)?;
            }

            Ok(line.id) as Result<String, OutError>
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(line_id)
}
#[derive(Debug, PartialEq)]
pub enum DeleteInboundShipmentLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotAnInboundShipment,
    NotThisStoreInvoice,
    CannotEditFinalised,
    BatchIsReserved,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for DeleteInboundShipmentLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteInboundShipmentLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteInboundShipmentLineError
where
    ERR: Into<DeleteInboundShipmentLineError>,
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
            mock_inbound_shipment_a_invoice_lines, mock_inbound_shipment_b_invoice_lines,
            mock_inbound_shipment_c_invoice_lines, mock_outbound_shipment_a_invoice_lines,
            mock_store_a, mock_user_account_a, MockDataInserts,
        },
        test_db::setup_all,
        InvoiceLineRowRepository,
    };

    use crate::{
        invoice_line::inbound_shipment_line::delete::DeleteInboundShipmentLine,
        invoice_line::inbound_shipment_line::DeleteInboundShipmentLineError as ServiceError,
        service_provider::ServiceProvider,
    };

    #[actix_rt::test]
    async fn delete_inbound_shipment_line_errors() {
        let (_, _, connection_manager, _) = setup_all(
            "delete_inbound_shipment_line_errors",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        // LineDoesNotExist
        assert_eq!(
            service.delete_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                DeleteInboundShipmentLine {
                    id: "invalid".to_owned(),
                },
            ),
            Err(ServiceError::LineDoesNotExist)
        );

        // NotAnInboundShipment
        assert_eq!(
            service.delete_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                DeleteInboundShipmentLine {
                    id: mock_outbound_shipment_a_invoice_lines()[1].id.clone(),
                },
            ),
            Err(ServiceError::NotAnInboundShipment)
        );

        // CannotEditFinalised
        assert_eq!(
            service.delete_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                DeleteInboundShipmentLine {
                    id: mock_inbound_shipment_b_invoice_lines()[0].id.clone(),
                },
            ),
            Err(ServiceError::CannotEditFinalised)
        );

        // BatchIsReserved
        assert_eq!(
            service.delete_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                DeleteInboundShipmentLine {
                    id: mock_inbound_shipment_a_invoice_lines()[0].id.clone(),
                },
            ),
            Err(ServiceError::BatchIsReserved)
        );

        //TODO DatabaseError, InvoiceDoesNotExist, NotThisStoreInvoice, NotThisInvoiceLine
    }

    #[actix_rt::test]
    async fn delete_inbound_shipment_line_success() {
        let (_, connection, connection_manager, _) = setup_all(
            "delete_inbound_shipment_line_success",
            MockDataInserts::all(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.context().unwrap();
        let service = service_provider.invoice_line_service;

        let invoice_line_id = service
            .delete_inbound_shipment_line(
                &context,
                &mock_store_a().id,
                &mock_user_account_a().id,
                DeleteInboundShipmentLine {
                    id: mock_inbound_shipment_c_invoice_lines()[0].id.clone(),
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
