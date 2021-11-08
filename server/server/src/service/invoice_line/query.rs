use crate::{
    database::repository::{InvoiceLineQueryRepository, StorageConnectionManager},
    domain::{
        invoice_line::{InvoiceLine, InvoiceLineFilter},
        Pagination,
    },
    service::SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_invoice_line(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<InvoiceLine, SingleRecordError> {
    let connection = connection_manager.connection()?;

    let mut result = InvoiceLineQueryRepository::new(&connection).query(
        Pagination::one(),
        Some(InvoiceLineFilter::new().match_id(&id)),
        None,
    )?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
