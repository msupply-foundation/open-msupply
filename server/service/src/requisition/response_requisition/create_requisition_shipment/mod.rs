use crate::service_provider::ServiceContext;
use repository::EqualFilter;
use repository::{
    Invoice, InvoiceFilter, InvoiceLineRowRepository, InvoiceRepository, InvoiceRowRepository,
    RepositoryError,
};

mod generate;
mod test;
mod validate;

use generate::*;
use validate::*;

#[derive(Debug, PartialEq)]
pub struct CreateRequisitionShipment {
    pub response_requisition_id: String,
}

#[derive(Debug, PartialEq)]
pub enum CreateRequisitionShipmentError {
    RequisitionDoesNotExist,
    NotThisStoreRequisition,
    CannotEditRequisition,
    NotAResponseRequisition,
    NothingRemainingToSupply,
    CreatedInvoiceDoesNotExist,
    ProblemGettingOtherParty,
    ProblemFindingItem,
    DatabaseError(RepositoryError),
}

type OutError = CreateRequisitionShipmentError;

pub fn create_requisition_shipment(
    ctx: &ServiceContext,
    store_id: &str,
    user_id: &str,
    input: CreateRequisitionShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (requisition_row, fullfilments) = validate(connection, store_id, &input)?;
            let (invoice_row, invoice_line_rows) =
                generate(connection, store_id, user_id, requisition_row, fullfilments)?;

            InvoiceRowRepository::new(&connection).upsert_one(&invoice_row)?;

            let invoice_line_repository = InvoiceLineRowRepository::new(&connection);
            for row in invoice_line_rows {
                invoice_line_repository.upsert_one(&row)?;
            }

            // TODO use invoice service if it accepts ctx
            let mut result = InvoiceRepository::new(&connection)
                .query_by_filter(InvoiceFilter::new().id(EqualFilter::equal_to(&invoice_row.id)))?;

            result.pop().ok_or(OutError::CreatedInvoiceDoesNotExist)
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(invoice)
}

impl From<RepositoryError> for CreateRequisitionShipmentError {
    fn from(error: RepositoryError) -> Self {
        CreateRequisitionShipmentError::DatabaseError(error)
    }
}
