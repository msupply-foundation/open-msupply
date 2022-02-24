use crate::{service_provider::ServiceContext, SingleRecordError};
use domain::{invoice_line::InvoiceLine, EqualFilter, Pagination};
use repository::{
    InvoiceLineFilter, InvoiceLineRepository, RepositoryError, StorageConnectionManager,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_invoice_line(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<InvoiceLine, SingleRecordError> {
    let connection = connection_manager.connection()?;

    let mut result = InvoiceLineRepository::new(&connection).query(
        Pagination::one(),
        Some(InvoiceLineFilter::new().id(EqualFilter::equal_to(&id))),
        None,
    )?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}

// TODO rename to get_invoice_line, when code is refactored to use service context
pub fn get_invoice_line_ctx(
    ctx: &ServiceContext,
    id: String,
) -> Result<Option<InvoiceLine>, RepositoryError> {
    let mut result = InvoiceLineRepository::new(&ctx.connection)
        .query_by_filter(InvoiceLineFilter::new().id(EqualFilter::equal_to(&id)))?;

    Ok(result.pop())
}
