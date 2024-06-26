use repository::{
    ledger::{LedgerFilter, LedgerRepository, LedgerRow, LedgerSort},
    Pagination, StorageConnectionManager,
};

use crate::usize_to_u32;

use super::{ListError, ListResult};

// pub const MAX_LIMIT: u32 = 5000;
// pub const MIN_LIMIT: u32 = 1;

pub fn get_ledger(
    connection_manager: &StorageConnectionManager,
    filter: Option<LedgerFilter>,
    sort: Option<LedgerSort>,
) -> Result<ListResult<LedgerRow>, ListError> {
    let connection = connection_manager.connection()?;
    let repository = LedgerRepository::new(&connection);

    let rows = repository.query(Pagination::all(), filter.clone(), sort)?;
    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}
