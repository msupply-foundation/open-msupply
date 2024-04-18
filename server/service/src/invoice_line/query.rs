use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineSort,
    InvoiceRepository, PaginationOption, RepositoryError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

#[derive(Debug, PartialEq)]
pub enum GetInvoiceLinesError {
    DatabaseError(RepositoryError),
    /// Invoice doesn't belong to the specified store
    InvalidStore,
    InvalidInvoice,
    ListError(ListError),
}

impl From<RepositoryError> for GetInvoiceLinesError {
    fn from(error: RepositoryError) -> Self {
        GetInvoiceLinesError::DatabaseError(error)
    }
}

pub fn get_invoice_line(
    ctx: &ServiceContext,
    id: &str,
) -> Result<Option<InvoiceLine>, RepositoryError> {
    let mut result = InvoiceLineRepository::new(&ctx.connection)
        .query_by_filter(InvoiceLineFilter::new().id(EqualFilter::equal_to(id)))?;

    Ok(result.pop())
}

pub fn get_invoice_lines(
    ctx: &ServiceContext,
    store_id: &str,
    invoice_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceLineFilter>,
    sort: Option<InvoiceLineSort>,
) -> Result<ListResult<InvoiceLine>, GetInvoiceLinesError> {
    let invoice = InvoiceRepository::new(&ctx.connection).find_one_by_id(invoice_id)?;
    if invoice.0.store_id != store_id {
        return Err(GetInvoiceLinesError::InvalidStore);
    }
    let filter = filter
        .unwrap_or_default()
        .invoice_id(EqualFilter::equal_to(invoice_id));
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)
        .map_err(GetInvoiceLinesError::ListError)?;

    let repository = InvoiceLineRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}
