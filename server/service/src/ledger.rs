use std::collections::HashMap;

use repository::{
    ledger::{LedgerFilter, LedgerRepository, LedgerRow, LedgerSort, LedgerSortField},
    EqualFilter, Pagination, PaginationOption, StorageConnection, StorageConnectionManager,
};

use crate::{get_default_pagination_unlimited, usize_to_u32};

use super::{ListError, ListResult};

#[derive(Debug)]
pub struct ItemLedger {
    pub ledger: LedgerRow,
    pub balance: f64,
}

pub struct ItemLedgerWithCursor {
    pub item_ledger: ItemLedger,
    pub cursor: i32,
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

    let all_ledger_items = repository.query(
        Pagination::all(),
        Some(filter.clone()),
        Some(LedgerSort {
            key: LedgerSortField::Datetime,
            desc: Some(false),
        }),
    )?;
    let total_count = usize_to_u32(all_ledger_items.len());
    let item_ledgers = calculate_ledger_balance(pagination, sort, all_ledger_items);

    Ok(ListResult {
        count: total_count,
        rows: item_ledgers,
    })
}

fn calculate_ledger_balance(
    pagination: Pagination,
    sort: Option<LedgerSort>,
    all_ledger_items: Vec<LedgerRow>, // This is assumed to be sorted by datetime ascending
) -> Vec<ItemLedger> {
    // TODO fix in refactor. Hashmap because currently we can still query for multiple items.
    // See in issue #7905
    let mut running_balance = HashMap::<String, f64>::new(); // String -> item_id, f64 -> running balance

    let mut item_ledgers: Vec<ItemLedger> = Vec::new();

    for ledger in all_ledger_items {
        // we want to iterate through all ledger items to calculate the balance
        let previous_balance = running_balance.get(&ledger.item_id).cloned().unwrap_or(0.0);
        running_balance.insert(ledger.item_id.clone(), previous_balance + ledger.quantity);

        let new_ledger = ItemLedger {
            ledger: ledger.clone(),
            balance: previous_balance + ledger.quantity,
        };

        item_ledgers.push(new_ledger);
    }

    // TODO Fix or remove manual sort. Sorting by anything other than the existing datetime sort gets balance out of order
    if let Some(sort) = sort {
        match sort.key {
            LedgerSortField::Id => {
                item_ledgers.sort_by_key(|l| l.ledger.id.clone());
            }
            LedgerSortField::Datetime => {
                // Don't need to re-sort it, as it's already in datetime order and re-sorting risks getting rows out of order
            }
            LedgerSortField::Name => {
                item_ledgers.sort_by_key(|l| l.ledger.name.clone());
            }
            LedgerSortField::InvoiceType => {
                item_ledgers.sort_by(|a, b| {
                    a.ledger
                        .invoice_type
                        .partial_cmp(&b.ledger.invoice_type)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
            }
            LedgerSortField::StockLineId => {
                item_ledgers.sort_by_key(|l| l.ledger.stock_line_id.clone());
            }
            LedgerSortField::Quantity => {
                item_ledgers.sort_by(|a, b| {
                    a.ledger
                        .quantity
                        .partial_cmp(&b.ledger.quantity)
                        .unwrap_or(std::cmp::Ordering::Equal)
                });
            }
            LedgerSortField::ItemId => {
                item_ledgers.sort_by_key(|l| l.ledger.item_id.clone());
            }
        }

        if sort.desc.unwrap_or(false) {
            item_ledgers.reverse();
        }
    }

    // manually paginate, as we didn't paginate the initial query
    let item_ledgers_trimmed: Vec<ItemLedger> = item_ledgers
        .into_iter()
        .skip(pagination.offset as usize)
        .take(pagination.limit as usize)
        .collect();

    item_ledgers_trimmed
}

// Add tests for calculate_ledger_balance function
#[cfg(test)]
mod tests {

    use super::*;
    use chrono::NaiveDateTime;
    use repository::{ledger::LedgerRow, InvoiceType};

    #[actix_rt::test]
    async fn test_calculate_ledger_balance() {
        // ledger rows are called in

        let all_ledger_items = vec![
            LedgerRow {
                id: "1".to_string(),
                item_id: "item1".to_string(),
                quantity: 2400.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-03T22:16:26.986939",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                invoice_type: InvoiceType::InboundShipment,
                ..Default::default()
            },
            LedgerRow {
                id: "2".to_string(),
                item_id: "item1".to_string(),
                quantity: 1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                invoice_type: InvoiceType::OutboundShipment,
                ..Default::default()
            },
            LedgerRow {
                id: "3".to_string(),
                item_id: "item1".to_string(),
                quantity: -1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892", // Same time as above
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                invoice_type: InvoiceType::OutboundShipment,
                ..Default::default()
            },
            LedgerRow {
                id: "4".to_string(),
                item_id: "item1".to_string(),
                quantity: -1176.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-05-19T02:57:15.920256",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                invoice_type: InvoiceType::InboundShipment,
                ..Default::default()
            },
        ];
        let pagination = get_default_pagination_unlimited(None);
        let result = calculate_ledger_balance(pagination, None, all_ledger_items.clone());

        assert_eq!(result.len(), 4);

        // check that balances are calculated correctly by line rather than summing when multiple ledgers occur at the same time
        // in this case the middle two ledgers are a repack, and occur at the same time

        assert_eq!(result[0].balance, 2400.0);
        assert_eq!(result[1].balance, 3600.0);
        assert_eq!(result[2].balance, 2400.0);
        assert_eq!(result[3].balance, 1224.0);

        // check ledger order is coherent with descending datetime sort
        let pagination = get_default_pagination_unlimited(None);

        let sort = LedgerSort {
            key: LedgerSortField::Datetime,
            desc: Some(true),
        };
        let result = calculate_ledger_balance(pagination, Some(sort), all_ledger_items.clone());

        assert_eq!(result[0].balance, 1224.0);
        assert_eq!(result[1].balance, 2400.0);
        assert_eq!(result[2].balance, 3600.0);
        assert_eq!(result[3].balance, 2400.0);

        // assert manual sorting works as expected
        let pagination = get_default_pagination_unlimited(None);
        let sort = LedgerSort {
            key: LedgerSortField::InvoiceType,
            desc: Some(false),
        };
        let result = calculate_ledger_balance(pagination, Some(sort), all_ledger_items);

        assert_eq!(result[0].balance, 3600.0);
        assert_eq!(result[1].balance, 2400.0);
        assert_eq!(result[2].balance, 2400.0);
        assert_eq!(result[3].balance, 1224.0);
    }

    #[actix_rt::test]
    async fn test_calculate_ledger_balance_with_multiple_items() {
        // ledger rows can be called in any order. In this case simulating descending order by datetime

        let all_ledger_items = vec![
            LedgerRow {
                id: "1".to_string(),
                item_id: "item1".to_string(),
                quantity: 2400.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-03T22:16:26.986939",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                ..Default::default()
            },
            LedgerRow {
                id: "2".to_string(),
                item_id: "item2".to_string(),
                quantity: 1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                ..Default::default()
            },
            LedgerRow {
                id: "3".to_string(),
                item_id: "item2".to_string(),
                quantity: -1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                ..Default::default()
            },
            LedgerRow {
                id: "4".to_string(),
                item_id: "item1".to_string(),
                quantity: -1176.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-05-19T02:57:15.920256",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                ..Default::default()
            },
        ];
        let sort = LedgerSort {
            key: LedgerSortField::Datetime,
            desc: Some(true),
        };
        let pagination = get_default_pagination_unlimited(None);
        let result = calculate_ledger_balance(pagination, Some(sort), all_ledger_items);

        assert_eq!(result.len(), 4);

        // check that balances are calculated correctly differentiating by item_id
        assert_eq!(result[0].balance, 1224.0);
        assert_eq!(result[0].ledger.item_id, "item1");

        assert_eq!(result[1].balance, 0.0);
        assert_eq!(result[1].ledger.item_id, "item2");

        assert_eq!(result[2].balance, 1200.0);
        assert_eq!(result[2].ledger.item_id, "item2");

        assert_eq!(result[3].balance, 2400.0);
        assert_eq!(result[3].ledger.item_id, "item1");
    }
}
