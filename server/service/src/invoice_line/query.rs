use crate::{
    get_pagination_or_default, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineSort,
    PaginationOption, RepositoryError,
};

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
        .query_by_filter(InvoiceLineFilter::new().id(EqualFilter::equal_to(id.to_string())))?;

    Ok(result.pop())
}

pub fn get_invoice_lines(
    ctx: &ServiceContext,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceLineFilter>,
    sort: Option<InvoiceLineSort>,
) -> Result<ListResult<InvoiceLine>, GetInvoiceLinesError> {
    let filter = filter
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(store_id.to_string()));
    let pagination =
        get_pagination_or_default(pagination).map_err(GetInvoiceLinesError::ListError)?;

    let repository = InvoiceLineRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(pagination, Some(filter.clone()), sort)?,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}
