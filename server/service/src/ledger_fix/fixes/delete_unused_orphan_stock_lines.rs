use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, StockLineRowRepository,
    StorageConnection,
};

use crate::ledger_fix::{
    fixes::{is_omsupply_uuid, LedgerFixError},
    ledger_balance_summary, LedgerBalanceSummary,
};

pub(crate) fn fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting delete_unused_orphan_stock_lines\n");

    let ledger_lines = StockLineLedgerRepository::new(connection).query_by_filter(
        StockLineLedgerFilter::new().stock_line_id(EqualFilter::equal_to(stock_line_id)),
    )?;

    let balance_summary = ledger_balance_summary(connection, &ledger_lines, stock_line_id)?;
    let LedgerBalanceSummary {
        available,
        total,
        running_balance,
        reserved_not_picked,
        ..
    } = balance_summary;

    let should_adjust = available + reserved_not_picked == total
        && total != running_balance
        && !is_omsupply_uuid(stock_line_id); // The lines we're targeting were created on legacy central, so should have legacy ID format

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for delete_unused_orphan_stock_lines {:?}.\n",
            balance_summary
        ));
        return Ok(());
    }

    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().stock_line_id(EqualFilter::equal_to(stock_line_id)),
    )?;

    if invoice_lines.len() > 0 {
        operation_log.push_str(&format!(
            "Skipping delete_unused_orphan_stock_lines, stock_line already used in invoice_lines: {:?}.\n",
            invoice_lines.len()
        ));
        return Ok(());
    }

    let stock_line = StockLineRowRepository::new(connection).find_one_by_id(stock_line_id)?;

    StockLineRowRepository::new(connection).delete(stock_line_id)?;

    operation_log.push_str(&format!("Deleted stock_line: {:?}.\n", stock_line));

    Ok(())
}

#[cfg(test)]

pub(crate) mod test {
    use super::*;
    use crate::{
        ledger_fix::is_ledger_fixed,
        test_helpers::{
            make_movements, setup_all_with_data_and_service_provider, ServiceTestContext,
        },
    };
    use repository::{
        mock::{mock_item_a, mock_store_a, MockData, MockDataInserts},
        KeyValueStoreRepository, StockLineRow,
    };

    pub(crate) fn mock_data() -> MockData {
        let oms_stock_line = StockLineRow {
            id: "oms-stock-line".to_string(), // OMS ID format
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            available_number_of_packs: 3.0,
            total_number_of_packs: 3.0,
            ..Default::default()
        };

        let oms_orphan_stock_line = StockLineRow {
            id: "oms-orphan-stock-line".to_string(),
            ..oms_stock_line.clone()
        };

        let legacy_orphan_stock_line = StockLineRow {
            id: "legacy_orphan_stock_line".to_string(), // must not contain `-` to be legacy ID format.
            ..oms_stock_line.clone()
        };

        let legacy_stock_line = StockLineRow {
            id: "legacy_stock_line".to_string(), // must not contain `-` to be legacy ID format.
            ..oms_stock_line.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![
                oms_stock_line.clone(),
                oms_orphan_stock_line,
                legacy_orphan_stock_line,
                legacy_stock_line.clone(),
            ],
            ..Default::default()
        }
        .join(make_movements(oms_stock_line, vec![(1, 10), (2, -7)]))
        .join(make_movements(
            legacy_stock_line,
            vec![(1, -1), (1, -1), (1, -1)],
        ));

        mock_data
    }

    #[actix_rt::test]
    async fn delete_unused_orphan_stock_lines_test() {
        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "delete_unused_orphan_stock_lines_test",
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

        // A perfectly valid line isn't touched if somehow given
        let mut logs = String::new();
        assert_eq!(is_ledger_fixed(&connection, "oms-stock-line"), Ok(true));
        fix(&connection, &mut logs, "oms-stock-line").unwrap();
        assert_eq!(is_ledger_fixed(&connection, "oms-stock-line"), Ok(true));
        assert!(logs.contains("Ledger does not match use case for"));

        // An orphan from OG is deleted
        let mut logs = String::new();
        let legacy_orphan_stock_line = StockLineRowRepository::new(&connection)
            .find_one_by_id("legacy_orphan_stock_line")
            .unwrap()
            .unwrap();
        assert_eq!(
            is_ledger_fixed(&connection, "legacy_orphan_stock_line"),
            Ok(false)
        );
        fix(&connection, &mut logs, "legacy_orphan_stock_line").unwrap();
        assert_eq!(
            is_ledger_fixed(&connection, "legacy_orphan_stock_line"),
            Ok(true)
        );
        assert!(logs.contains(format!("{legacy_orphan_stock_line:?}").as_str()));

        // An orphan from OMS is left alone
        let mut logs = String::new();
        assert_eq!(
            is_ledger_fixed(&connection, "oms-orphan-stock-line"),
            Ok(false)
        );
        fix(&connection, &mut logs, "oms-orphan-stock-line").unwrap();
        assert_eq!(
            is_ledger_fixed(&connection, "oms-orphan-stock-line"),
            Ok(false)
        );
        assert!(logs.contains("Ledger does not match use case for"));

        // What was an orphan from OG but has since been issued is not deleted
        let mut logs = String::new();
        assert_eq!(is_ledger_fixed(&connection, "legacy_stock_line"), Ok(false));
        fix(&connection, &mut logs, "legacy_stock_line").unwrap();
        assert_eq!(is_ledger_fixed(&connection, "legacy_stock_line"), Ok(false));
        assert!(logs.contains("stock_line already used in invoice_lines"));
    }
}
