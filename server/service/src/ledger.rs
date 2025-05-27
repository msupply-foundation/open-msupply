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

    let item_ledgers = calculate_ledger_balance(rows, all_ledger_items);

    Ok(ListResult {
        count: i64_to_u32(repository.count(Some(filter))?),
        rows: item_ledgers,
    })
}

fn calculate_ledger_balance(
    rows: Vec<LedgerRow>,
    all_ledger_items: Vec<LedgerRow>,
) -> Vec<ItemLedger> {
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
    item_ledgers
}

// Add tests for calculate_ledger_balance function
// Note test does not simulate case where multiple items are queried.
#[cfg(test)]
mod tests {
    use std::default;

    use super::*;
    use chrono::{NaiveDate, NaiveDateTime};
    use repository::ledger::LedgerRow;

    #[actix_rt::test]
    async fn test_calculate_ledger_balance() {
        // ledger rows can be called in any order. In this case simulating descending order by datetime
        let ledger_rows = vec![
            LedgerRow {
                quantity: -1176.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-05-19T02:57:15.920256",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                quantity: 1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                quantity: -1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                quantity: 2400.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-03T22:16:26.986939",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
        ];

        let all_ledger_items = vec![
            LedgerRow {
                quantity: 2400.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-03T22:16:26.986939",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                quantity: 1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                quantity: -1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                ..Default::default()
            },
            LedgerRow {
                quantity: -1176.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-05-19T02:57:15.920256",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                ..Default::default()
            },
        ];

        let result = calculate_ledger_balance(ledger_rows, all_ledger_items);

        assert_eq!(result.len(), 4);

        // check that balances are calculated correctly by line rather than summing when multiple ledgers
        // occur at the same time
        // in this case the middle two ledgers are a repack, and occur at the same time
        assert_eq!(result[0].balance, 1224.0);
        assert_eq!(result[1].balance, 2400.0);
        assert_eq!(result[2].balance, 3600.0);
        assert_eq!(result[3].balance, 2400.0);
    }

    #[actix_rt::test]
    async fn test_calculate_ledger_balance_with_multiple_items() {
        // ledger rows can be called in any order. In this case simulating descending order by datetime
        let ledger_rows = vec![
            LedgerRow {
                item_id: "item1".to_string(),
                quantity: -1176.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-05-19T02:57:15.920256",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                item_id: "item2".to_string(),
                quantity: 1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                item_id: "item2".to_string(),
                quantity: -1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                item_id: "item1".to_string(),
                quantity: 2400.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-03T22:16:26.986939",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
        ];

        let all_ledger_items = vec![
            LedgerRow {
                item_id: "item1".to_string(),
                quantity: 2400.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-03T22:16:26.986939",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
                item_id: "item2".to_string(),
                quantity: 1200.0,
                datetime: NaiveDateTime::parse_from_str(
                    "2025-02-05T04:43:02.213892",
                    "%Y-%m-%dT%H:%M:%S%.f",
                )
                .unwrap(),
                expiry_date: Some(NaiveDate::from_ymd_opt(2021, 2, 28).unwrap()),
                ..Default::default()
            },
            LedgerRow {
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

        let result = calculate_ledger_balance(ledger_rows, all_ledger_items);

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
