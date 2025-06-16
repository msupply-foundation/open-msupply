use super::{ListError, ListResult};
use repository::{
    ledger::{LedgerFilter, LedgerRepository, LedgerRow, LedgerSort},
    EqualFilter, ItemLedgerFilter, ItemLedgerRepository, ItemLedgerRow, PaginationOption,
    StorageConnection, StorageConnectionManager,
};

use crate::{get_default_pagination_unlimited, i64_to_u32, usize_to_u32};

pub fn get_ledger(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<LedgerFilter>,
    sort: Option<LedgerSort>,
) -> Result<ListResult<LedgerRow>, ListError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let connection = connection_manager.connection()?;
    let repository = LedgerRepository::new(&connection);

    let rows = repository.query(pagination, filter, sort)?;
    Ok(ListResult {
        count: usize_to_u32(rows.len()),
        rows,
    })
}

pub fn get_item_ledger(
    connection: &StorageConnection,
    store_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<ItemLedgerFilter>,
) -> Result<ListResult<ItemLedgerRow>, ListError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = ItemLedgerRepository::new(connection);
    let filter = filter
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(store_id));

    let ledgers = repository.query(pagination, Some(filter.clone()))?;

    Ok(ListResult {
        count: i64_to_u32(repository.count(Some(filter))?),
        rows: ledgers,
    })
}
