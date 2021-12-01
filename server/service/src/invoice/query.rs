use crate::{get_default_pagination, i64_to_u32, ListError, ListResult, SingleRecordError};
use domain::{
    invoice::{Invoice, InvoiceFilter, InvoiceSort},
    EqualFilter, PaginationOption,
};
use repository::{InvoiceQueryRepository, StorageConnectionManager};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_invoices(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<InvoiceFilter>,
    sort: Option<InvoiceSort>,
) -> Result<ListResult<Invoice>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let connection = connection_manager.connection()?;
    let repository = InvoiceQueryRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_invoice(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<Invoice, SingleRecordError> {
    let connection = connection_manager.connection()?;

    let mut result = InvoiceQueryRepository::new(&connection)
        .query_by_filter(InvoiceFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
