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
