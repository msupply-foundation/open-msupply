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
) -> Result</* stock line ids */ Vec<String>, FindStockLineLedgerDiscrepanciesError> {
    let active_stores = ActiveStoresOnSite::get(connection)?;

    let filter = StockLineLedgerDiscrepancyFilter {
        stock_line: Some(
            StockLineFilter::new()
                .store_id(EqualFilter::equal_any_or_null(active_stores.store_ids())),
        ),
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
    use chrono::Utc;
    use repository::{
        mock::{mock_item_a, mock_name_a, mock_store_a, mock_store_b, MockData, MockDataInserts},
        InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
        KeyValueStoreRepository, StockLineRow,
    };
    use util::inline_edit;

    fn make_movements(stock_line: StockLineRow, date_quantity: Vec<(i64, i64)>) -> MockData {
        let (invoices, invoice_lines) = date_quantity
            .into_iter()
            .map(|(date, quantity)| {
                let invoice_id = format!("invoice_{}_{}_{}", stock_line.id, date, quantity);
                let date = Utc::now().naive_utc() + chrono::Duration::days(date - 30);

                (
                    InvoiceRow {
                        id: invoice_id.clone(),
                        store_id: stock_line.store_id.clone(),
                        name_link_id: mock_name_a().id.clone(),
                        r#type: if quantity > 0 {
                            InvoiceType::InboundShipment
                        } else {
                            InvoiceType::OutboundShipment
                        },
                        status: if quantity > 0 {
                            InvoiceStatus::Verified
                        } else {
                            InvoiceStatus::Shipped
                        },
                        created_datetime: date,
                        allocated_datetime: Some(date),
                        picked_datetime: Some(date),
                        shipped_datetime: Some(date),
                        delivered_datetime: Some(date),
                        received_datetime: Some(date),
                        verified_datetime: Some(date),
                        ..Default::default()
                    },
                    InvoiceLineRow {
                        id: format!("line_{}", invoice_id),
                        invoice_id,
                        item_link_id: stock_line.item_link_id.clone(),
                        stock_line_id: Some(stock_line.id.clone()),
                        pack_size: stock_line.pack_size,
                        number_of_packs: quantity.abs() as f64,
                        r#type: if quantity > 0 {
                            InvoiceLineType::StockIn
                        } else {
                            InvoiceLineType::StockOut
                        },
                        ..Default::default()
                    },
                )
            })
            .unzip();

        MockData {
            invoices,
            invoice_lines,

            ..Default::default()
        }
    }

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
            vec![(7, 6), (3, -2), (5, -3), (25, -1)],
        ));

        let mut allocated_not_picked_movements = make_movements(
            correct_with_some_allocated_not_picked,
            vec![
                (1, 200),
                (3, -100),
                (5, -50), /* will be changed to allocated status */
            ],
        );

        allocated_not_picked_movements.invoices[2] =
            inline_edit(&allocated_not_picked_movements.invoices[2], |mut u| {
                u.status = InvoiceStatus::Allocated;
                u.picked_datetime = None;
                u.shipped_datetime = None;
                u.received_datetime = None;
                u.verified_datetime = None;
                u
            });

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

        let mut stock_line_ids = find_stock_line_ledger_discrepancies(&connection).unwrap();
        stock_line_ids.sort();

        assert_eq!(
            stock_line_ids,
            vec![
                "negative_balance".to_string(),
                "total_not_matched".to_string()
            ]
        );
    }
}
