use crate::service_provider::ServiceContext;
use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, RepositoryError,
};

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
    filter: Option<InvoiceLineFilter>,
) -> Result<Vec<InvoiceLine>, RepositoryError> {
    InvoiceLineRepository::new(&ctx.connection)
        .query_by_filter(filter.unwrap_or(InvoiceLineFilter::new()))
}
