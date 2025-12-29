use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    EqualFilter, StockLineRow, StockLineRowRepository, StorageConnection,
};

use crate::ledger_fix::{
    fixes::{adjust_ledger_running_balance, LedgerFixError},
    ledger_balance_summary, LedgerBalanceSummary,
};

pub(crate) fn fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting adjust_all_to_match_available\n");

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

    let should_adjust = available + reserved_not_picked != total
        && total != running_balance
        && available + reserved_not_picked != running_balance;

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for adjust_all_to_match_available {:?}.\n",
            balance_summary
        ));
        return Ok(());
    }

    let Some(stock_line) = StockLineRowRepository::new(connection).find_one_by_id(stock_line_id)?
    else {
        return LedgerFixError::other("Stock line not found for adjustment");
    };

    let reserved_in_packs = reserved_not_picked / stock_line.pack_size;

    let updated_stock_line = StockLineRow {
        total_number_of_packs: stock_line.available_number_of_packs + reserved_in_packs,
        ..stock_line
    };

    operation_log.push_str(&format!(
        "Adjusting stock line {} adjust total {} to match available {} + reserve not yet picked {}\n",
        stock_line_id, updated_stock_line.total_number_of_packs, updated_stock_line.available_number_of_packs, reserved_in_packs
    ));

    StockLineRowRepository::new(connection).upsert_one(&updated_stock_line)?;

    adjust_ledger_running_balance(
        connection,
        operation_log,
        &ledger_lines,
        running_balance,
        available + reserved_not_picked,
        stock_line_id,
    )?;

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
        let nothing_matches = StockLineRow {
            id: "nothing_matches".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 2.0,
            available_number_of_packs: 5.0,
            total_number_of_packs: 3.0,
            ..Default::default()
        };

        let mock_data = MockData {
            stock_lines: vec![nothing_matches.clone()],
            ..Default::default()
        };

        let mut nothing_matches =
            make_movements(nothing_matches, vec![(2, 10), (4, -10), (5, 30), (6, -7)]);

        // Add reserved not picked
        nothing_matches.invoices[3].status = InvoiceStatus::Allocated;
        nothing_matches.invoices[3].picked_datetime = None;
        nothing_matches.invoices[3].shipped_datetime = None;
        nothing_matches.invoices[3].received_datetime = None;
        nothing_matches.invoices[3].verified_datetime = None;

        mock_data.join(nothing_matches)
    }

    #[actix_rt::test]
    async fn adjust_all_to_match_available_test() {
        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "adjust_all_to_match_available",
            MockDataInserts::none()
                .names()
                .stores()
                .units()
                .items()
                .currencies(),
            mock_data(),
        )
        .await;

        KeyValueStoreRepository::new(&connection)
            .set_i32(
                repository::KeyType::SettingsSyncSiteId,
                Some(mock_store_a().site_id),
            )
            .unwrap();

        assert_eq!(is_ledger_fixed(&connection, "nothing_matches"), Ok(false));

        let mut logs = String::new();

        fix(&connection, &mut logs, "nothing_matches").unwrap();

        let stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id("nothing_matches")
            .unwrap()
            .unwrap();
        assert_eq!(
            stock_line,
            StockLineRow {
                total_number_of_packs: 12.0,    // 5 available + 7 reserved not picked
                available_number_of_packs: 5.0, // remains the same
                ..stock_line.clone()
            }
        );

        assert_eq!(
            StockLineLedgerRepository::new(&connection)
                .query_by_filter(
                    StockLineLedgerFilter::new()
                        .stock_line_id(EqualFilter::equal_to("nothing_matches".to_string()))
                )
                .unwrap()
                .into_iter()
                .map(|line| line.running_balance)
                .collect::<Vec<f64>>(),
            vec![20.0, 0.0, 60.0, 24.0]
        );

        assert_eq!(is_ledger_fixed(&connection, "nothing_matches"), Ok(true));
    }
}
