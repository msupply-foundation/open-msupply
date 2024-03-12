use crate::activity_log::activity_log_entry;
use crate::service_provider::ServiceContext;
use repository::{ActivityLogType, EqualFilter};
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
    input: CreateRequisitionShipment,
) -> Result<Invoice, OutError> {
    let invoice = ctx
        .connection
        .transaction_sync(|connection| {
            let (requisition_row, fulfillments) = validate(connection, &ctx.store_id, &input)?;
            let (invoice_row, invoice_line_rows) = generate(
                connection,
                &ctx.store_id,
                &ctx.user_id,
                requisition_row,
                fulfillments,
            )?;

            InvoiceRowRepository::new(&connection).upsert_one(&invoice_row)?;

            let invoice_line_repository = InvoiceLineRowRepository::new(&connection);
            for row in invoice_line_rows {
                invoice_line_repository.upsert_one(&row)?;
            }

            activity_log_entry(
                &ctx,
                ActivityLogType::InvoiceCreated,
                Some(invoice_row.id.to_owned()),
                None,
                None,
            )?;

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
