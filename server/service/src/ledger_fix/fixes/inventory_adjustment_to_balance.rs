use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    EqualFilter, StorageConnection,
};

use crate::ledger_fix::{
    fixes::{adjust_ledger_running_balance, is_omsupply_uuid, LedgerFixError},
    ledger_balance_summary, LedgerBalanceSummary,
};

pub(crate) fn fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting inventory_adjustment_to_balance\n");

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

    let should_adjust = available + reserved_not_picked == total
        && total != running_balance
        && !is_omsupply_uuid(stock_line_id);

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for inventory_adjustment_to_balance {:?}.\n",
            balance_summary
        ));
        return Ok(());
    }

    adjust_ledger_running_balance(
        connection,
        operation_log,
        &ledger_lines,
        running_balance,
        total,
        stock_line_id,
    )?;

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
        let positive_running_balance_fix = StockLineRow {
            id: "positive_running_balance_fix".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            available_number_of_packs: 3.0,
            total_number_of_packs: 3.0,
            ..Default::default()
        };

        let negative_running_balance_fix = StockLineRow {
            id: "negative_running_balance_fix".to_string(),
            pack_size: 1.0,
            ..positive_running_balance_fix.clone()
        };

        let positive_running_balance_fix_no_lines = StockLineRow {
            id: "positive_running_balance_fix_no_lines".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            available_number_of_packs: 3.0,
            total_number_of_packs: 3.0,
            ..Default::default()
        };

        let mock_data = MockData {
            stock_lines: vec![
                positive_running_balance_fix.clone(),
                negative_running_balance_fix.clone(),
                positive_running_balance_fix_no_lines.clone(),
            ],
            ..Default::default()
        }
        // Movements are (date as day, quantity)
        .join(make_movements(
            positive_running_balance_fix,
            vec![(2, 6), (3, -6), (4, 6), (5, -3), (25, -2), (27, 3)],
        ))
        .join(make_movements(
            negative_running_balance_fix,
            vec![
                (2, 6),
                (3, -6),
                (4, 6),
                (5, -3),
                (25, -2),
                (28, -10),
                (29, 3),
            ],
        ));

        mock_data
    }

    #[actix_rt::test]
    async fn inventory_adjustment_to_balance_test() {
        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "inventory_adjustment_to_balance",
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

        let repo = StockLineLedgerRepository::new(&connection);

        assert_eq!(
            is_ledger_fixed(&connection, "positive_running_balance_fix"),
            Ok(false)
        );

        let mut logs = String::new();

        fix(&connection, &mut logs, "positive_running_balance_fix").unwrap();

        assert_eq!(
            repo.query_by_filter(StockLineLedgerFilter::new().stock_line_id(
                EqualFilter::equal_to("positive_running_balance_fix".to_string())
            ))
            .unwrap()
            .into_iter()
            .map(|line| line.running_balance)
            .collect::<Vec<f64>>(),
            vec![6.0, 0.0, 6.0, 5.0, 2.0, 0.0, 3.0]
        );

        assert_eq!(
            is_ledger_fixed(&connection, "positive_running_balance_fix"),
            Ok(true)
        );

        assert_eq!(
            is_ledger_fixed(&connection, "negative_running_balance_fix"),
            Ok(false)
        );

        let mut logs = String::new();

        fix(&connection, &mut logs, "negative_running_balance_fix").unwrap();

        assert_eq!(
            repo.query_by_filter(StockLineLedgerFilter::new().stock_line_id(
                EqualFilter::equal_to("negative_running_balance_fix".to_string())
            ))
            .unwrap()
            .into_iter()
            .map(|line| line.running_balance)
            .collect::<Vec<f64>>(),
            vec![9.0, 15.0, 9.0, 15.0, 12.0, 10.0, 0.0, 3.0]
        );

        assert_eq!(
            is_ledger_fixed(&connection, "negative_running_balance_fix"),
            Ok(true)
        );

        assert_eq!(
            is_ledger_fixed(&connection, "positive_running_balance_fix_no_lines"),
            Ok(false)
        );
        fix(
            &connection,
            &mut logs,
            "positive_running_balance_fix_no_lines",
        )
        .unwrap();
        assert_eq!(
            is_ledger_fixed(&connection, "positive_running_balance_fix_no_lines"),
            Ok(true)
        );
    }
}
