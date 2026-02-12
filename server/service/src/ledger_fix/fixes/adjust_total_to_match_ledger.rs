use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    EqualFilter, StockLineRow, StockLineRowRepository, StorageConnection,
};

use crate::ledger_fix::{fixes::LedgerFixError, ledger_balance_summary, LedgerBalanceSummary};

pub(crate) fn fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting adjust_total_to_match_ledger\n");

    let ledger_lines = StockLineLedgerRepository::new(connection).query_by_filter(
        StockLineLedgerFilter::new()
            .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string())),
    )?;

    let balance_summary = ledger_balance_summary(connection, &ledger_lines, stock_line_id)?;
    let LedgerBalanceSummary {
        available,
        total,
        running_balance,
        reserved_not_picked,
        ..
    } = balance_summary;

    let should_adjust =
        available + reserved_not_picked == running_balance && total != running_balance;

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for adjust_total_to_match_ledger {:?}.\n",
            balance_summary
        ));
        return Ok(());
    }

    let Some(stock_line) = StockLineRowRepository::new(connection).find_one_by_id(stock_line_id)?
    else {
        return LedgerFixError::other("Stock line not found for adjustment");
    };

    let updated_stock_line = StockLineRow {
        total_number_of_packs: running_balance / stock_line.pack_size,
        ..stock_line
    };

    operation_log.push_str(&format!(
        "Adjusting stock line {} to match ledger with total number of packs: {}.\n",
        stock_line_id, updated_stock_line.total_number_of_packs
    ));
    StockLineRowRepository::new(connection).upsert_one(&updated_stock_line)?;

    Ok(())
}

#[cfg(test)]

pub(crate) mod test {
    use super::*;
    use crate::{
        ledger_fix::is_ledger_fixed,
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };
    use repository::{
        mock::{
            mock_item_a, mock_store_a, test_helpers::make_movements, MockData, MockDataInserts,
        },
        InvoiceStatus, KeyValueStoreRepository, StockLineRow,
    };

    pub(crate) fn mock_data() -> MockData {
        let total_does_not_match = StockLineRow {
            id: "total_does_not_match".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            available_number_of_packs: 40.0,
            total_number_of_packs: 30.0,
            ..Default::default()
        };

        let total_does_not_match_with_reserved = StockLineRow {
            id: "total_does_not_match_with_reserved".to_string(),
            available_number_of_packs: 20.0,
            ..total_does_not_match.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![
                total_does_not_match.clone(),
                total_does_not_match_with_reserved.clone(),
            ],
            ..Default::default()
        }
        // Movements are (date as day, quantity)
        .join(make_movements(
            total_does_not_match,
            // -10 was double picked
            vec![(2, 100), (3, -50), (4, -10)],
        ));

        let mut allocated_not_picked_movements = make_movements(
            total_does_not_match_with_reserved,
            vec![(2, 100), (3, -50), (4, -10), (10, -20)],
        );

        // Add reserved not picked
        allocated_not_picked_movements.invoices[3].status = InvoiceStatus::Allocated;
        allocated_not_picked_movements.invoices[3].picked_datetime = None;
        allocated_not_picked_movements.invoices[3].shipped_datetime = None;
        allocated_not_picked_movements.invoices[3].received_datetime = None;
        allocated_not_picked_movements.invoices[3].verified_datetime = None;

        mock_data.join(allocated_not_picked_movements)
    }

    #[actix_rt::test]
    async fn adjust_total_to_match_ledger_test() {
        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "adjust_total_to_match_ledger",
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

        assert_eq!(
            is_ledger_fixed(&connection, "total_does_not_match"),
            Ok(false)
        );

        let mut logs = String::new();

        fix(&connection, &mut logs, "total_does_not_match").unwrap();

        assert_eq!(
            is_ledger_fixed(&connection, "total_does_not_match"),
            Ok(true)
        );

        assert_eq!(
            is_ledger_fixed(&connection, "total_does_not_match_with_reserved"),
            Ok(false)
        );

        let mut logs = String::new();

        fix(&connection, &mut logs, "total_does_not_match_with_reserved").unwrap();

        assert_eq!(
            is_ledger_fixed(&connection, "total_does_not_match_with_reserved"),
            Ok(true)
        );
    }
}
