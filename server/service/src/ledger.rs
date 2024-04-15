use repository::{
    ledger::{LedgerFilter, LedgerRepository, LedgerRow},
    StorageConnectionManager,
};

use crate::usize_to_u32;

use super::{ListError, ListResult};

// pub const MAX_LIMIT: u32 = 5000;
// pub const MIN_LIMIT: u32 = 1;

pub fn get_ledger(
    connection_manager: &StorageConnectionManager,
    // pagination: Option<PaginationOption>,
    filter: Option<LedgerFilter>,
    // sort: Option<LedgerSort>,
    // store_id: &str,
) -> Result<ListResult<LedgerRow>, ListError> {
    // let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let connection = connection_manager.connection()?;
    let repository = LedgerRepository::new(&connection);

    let rows = repository.query(
        /*pagination,*/ filter.clone(), /*  sort, Some(store_id.to_owned())*/
    )?;
    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}
