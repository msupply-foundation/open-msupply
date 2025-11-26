use repository::{
    stock_line_ledger_discrepancy::{
        StockLineLedgerDiscrepancyFilter, StockLineLedgerDiscrepancyRepository,
    },
    EqualFilter, RepositoryError, StockLineFilter, StorageConnection,
};
use thiserror::Error;

use crate::sync::{ActiveStoresOnSite, GetActiveStoresOnSiteError};

#[derive(Error, Debug)]
pub enum FindStockLineLedgerDiscrepanciesError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("Failed to get active stores on site")]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
}

pub(super) fn find_stock_line_ledger_discrepancies(
    connection: &StorageConnection,
    stock_line_id: Option<&str>,
) -> Result</* stock line ids */ Vec<String>, FindStockLineLedgerDiscrepanciesError> {
    let active_stores = ActiveStoresOnSite::get(connection)?;

    // Filters
    let (stock_line, stock_line_id) = match stock_line_id {
        Some(id) => (None, Some(EqualFilter::equal_to(id))),
        None => (
            Some(
                StockLineFilter::new()
                    .store_id(EqualFilter::equal_any_or_null(active_stores.store_ids())),
            ),
            None,
        ),
    };

    let filter = StockLineLedgerDiscrepancyFilter {
        stock_line,
        stock_line_id,
    };

    Ok(StockLineLedgerDiscrepancyRepository::new(connection)
        .query(Some(filter))?
        .into_iter()
        .map(|r| r.id)
        .collect())
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext};
    use repository::{
        mock::{
            mock_item_a, mock_store_a, mock_store_b, test_helpers::make_movements, MockData,
            MockDataInserts,
        },
        InvoiceStatus, KeyValueStoreRepository, StockLineRow,
    };

    fn mock_data() -> MockData {
        let negative_balance = StockLineRow {
            id: "negative_balance".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        let correct = StockLineRow {
            id: "correct".to_string(),
            ..negative_balance.clone()
        };

        let total_not_matched = StockLineRow {
            id: "total_not_matched".to_string(),
            total_number_of_packs: 100.0,
            ..negative_balance.clone()
        };

        let orphan = StockLineRow {
            id: "orphan".to_string(),
            total_number_of_packs: 100.0,
            ..negative_balance.clone()
        };

        let correct_with_some_allocated_not_picked = StockLineRow {
            id: "correct_with_some_allocated_not_picked".to_string(),
            total_number_of_packs: 100.0,
            available_number_of_packs: 50.0,
            ..negative_balance.clone()
        };

        let negative_balance_non_active_store = StockLineRow {
            id: "negative_balance_non_active_store".to_string(),
            store_id: mock_store_b().id.clone(),
            ..negative_balance.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![
                negative_balance.clone(),
                correct.clone(),
                total_not_matched.clone(),
                correct_with_some_allocated_not_picked.clone(),
                negative_balance_non_active_store.clone(),
                orphan,
            ],
            ..Default::default()
        }
        // Movements are (date as day, quantity)
        .join(make_movements(
            negative_balance,
            vec![(3, -2), (5, -3), (7, 6), (25, -1)],
        ))
        .join(make_movements(
            correct,
            vec![(2, 6), (3, -2), (5, -3), (25, -1)],
        ))
        .join(make_movements(
            total_not_matched,
            vec![(1, 6), (3, -2), (5, -3), (25, -1)],
        ));

        let mut allocated_not_picked_movements = make_movements(
            correct_with_some_allocated_not_picked,
            vec![
                (1, 200),
                (3, -100),
                (5, -50), /* will be changed to allocated status */
            ],
        );

        allocated_not_picked_movements.invoices[2].status = InvoiceStatus::Allocated;
        allocated_not_picked_movements.invoices[2].picked_datetime = None;
        allocated_not_picked_movements.invoices[2].shipped_datetime = None;
        allocated_not_picked_movements.invoices[2].received_datetime = None;
        allocated_not_picked_movements.invoices[2].verified_datetime = None;

        mock_data
            .join(allocated_not_picked_movements)
            .join(make_movements(
                negative_balance_non_active_store,
                vec![(3, -2), (5, -3), (7, 6), (25, -1)],
            ))
    }

    #[actix_rt::test]
    async fn find_stock_line_ledger_discrepancies_test() {
        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "find_stock_line_ledger_discrepancies",
            MockDataInserts::none().names().stores().units().items(),
            mock_data(),
        )
        .await;

        KeyValueStoreRepository::new(&connection)
            .set_i32(
                repository::KeyType::SettingsSyncSiteId,
                Some(mock_store_a().site_id),
            )
            .unwrap();

        let mut stock_line_ids = find_stock_line_ledger_discrepancies(&connection, None).unwrap();
        stock_line_ids.sort();

        assert!(stock_line_ids.contains(&"negative_balance".to_string()));
        assert!(stock_line_ids.contains(&"total_not_matched".to_string()));
        assert!(stock_line_ids.contains(&"orphan".to_string()));
        assert!(!stock_line_ids.contains(&"correct".to_string()));
        assert!(!stock_line_ids.contains(&"correct_with_some_allocated_not_picked".to_string()));
        assert!(!stock_line_ids.contains(&"negative_balance_non_active_store".to_string()));
    }
}
