use repository::{
    ledger::{LedgerFilter, LedgerRepository, LedgerRow, LedgerSort, LedgerSortField},
    EqualFilter, Pagination, PaginationOption, StorageConnection, StorageConnectionManager,
};

use crate::{get_default_pagination_unlimited, i64_to_u32, usize_to_u32};

use super::{ListError, ListResult};

#[derive(Debug)]
pub struct ItemLedger {
    pub ledger: LedgerRow,
    pub balance: f64,
}

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
    filter: Option<LedgerFilter>,
    sort: Option<LedgerSort>,
) -> Result<ListResult<ItemLedger>, ListError> {
    let pagination = get_default_pagination_unlimited(pagination);
    let repository = LedgerRepository::new(&connection);
    let filter = filter
        .unwrap_or_default()
        .store_id(EqualFilter::equal_to(store_id));

    let rows = repository.query(pagination, Some(filter.clone()), sort)?;
    let all_ledger_items = repository.query(
        Pagination::all(),
        Some(filter.clone()),
        Some(LedgerSort {
            key: LedgerSortField::Datetime,
            desc: Some(false),
        }),
    )?;
    let mut item_ledgers = vec![];

    for row in rows {
        let current_and_previous_entries = all_ledger_items
            .iter()
            .filter(|ledger| ledger.item_id == row.item_id && ledger.datetime <= row.datetime)
            .collect::<Vec<_>>();

        let balance = current_and_previous_entries
            .iter()
            .map(|ledger| ledger.quantity)
            .sum();

        let ledger = ItemLedger {
            ledger: row,
            balance,
        };

        item_ledgers.push(ledger);
    }

    Ok(ListResult {
        count: i64_to_u32(repository.count(Some(filter))?),
        rows: item_ledgers,
    })
}
