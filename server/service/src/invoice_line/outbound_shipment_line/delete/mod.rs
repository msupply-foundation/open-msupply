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
    _store_id: &str,
    input: DeleteOutboundShipmentLine,
) -> Result<String, OutError> {
    let line_id = ctx
        .connection
        .transaction_sync(|connection| {
            let line = validate(&input, &connection)?;
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
    CannotEditFinalised,
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
