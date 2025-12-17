use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceStatus, StockLineRow,
    StockLineRowRepository, StorageConnection,
};

use crate::ledger_fix::{fixes::LedgerFixError, ledger_balance_summary, LedgerBalanceSummary};

pub(crate) fn fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting fix_cancellations\n");

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

    let cancelled = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string()))
            .invoice_status(InvoiceStatus::Cancelled.equal_to()),
    )?;

    let summed_cancelled = cancelled
        .iter()
        .map(|line| line.invoice_line_row.number_of_packs * line.invoice_line_row.pack_size)
        .sum::<f64>();

    let should_adjust = available + reserved_not_picked + summed_cancelled
        == total + summed_cancelled
        && total + summed_cancelled == running_balance;

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for fix_cancellations {:?}.\n",
            balance_summary
        ));
        return Ok(());
    }

    let Some(stock_line) = StockLineRowRepository::new(connection).find_one_by_id(stock_line_id)?
    else {
        return LedgerFixError::other("Stock line not found for adjustment");
    };

    let cancelled_in_packs = summed_cancelled / stock_line.pack_size;

    let updated_stock_line = StockLineRow {
        total_number_of_packs: stock_line.total_number_of_packs + cancelled_in_packs,
        available_number_of_packs: stock_line.available_number_of_packs + cancelled_in_packs,
        ..stock_line
    };

    operation_log.push_str(&format!(
        "Adjusting stock line {} adding cancelled {} to total and available, new total {}, new available {}\n",
        stock_line_id, cancelled_in_packs, updated_stock_line.total_number_of_packs, updated_stock_line.available_number_of_packs
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
        InvoiceType, KeyValueStoreRepository, StockLineRow,
    };

    pub(crate) fn mock_data() -> MockData {
        let cancellation = StockLineRow {
            id: "cancellation".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        let multiple_cancellations = StockLineRow {
            id: "multiple_cancellations".to_string(),
            pack_size: 1.0,
            available_number_of_packs: 2.0,
            total_number_of_packs: 2.0,
            ..cancellation.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![cancellation.clone(), multiple_cancellations.clone()],
            ..Default::default()
        };

        let mut with_cancellation = make_movements(
            cancellation,
            vec![(2, 5), (3, -3), (4, -1), (4, 1), (5, -1)],
        );
        // Adjust to cancellation
        with_cancellation.invoices[3].status = InvoiceStatus::Cancelled;
        with_cancellation.invoices[3].r#type = InvoiceType::Prescription;

        let mut with_multiple_cancellations = make_movements(
            multiple_cancellations,
            vec![(2, 7), (2, -1), (2, 1), (3, -3), (4, -1), (4, 1), (5, -1)],
        );
        // Adjust to cancellation
        with_multiple_cancellations.invoices[2].status = InvoiceStatus::Cancelled;
        with_multiple_cancellations.invoices[2].r#type = InvoiceType::Prescription;

        with_multiple_cancellations.invoices[5].status = InvoiceStatus::Cancelled;
        with_multiple_cancellations.invoices[5].r#type = InvoiceType::Prescription;

        mock_data
            .join(with_cancellation)
            .join(with_multiple_cancellations)
    }

    #[actix_rt::test]
    async fn fix_cancellations_test() {
        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "fix_cancellations",
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

        assert_eq!(is_ledger_fixed(&connection, "cancellation"), Ok(false));

        let mut logs = String::new();

        fix(&connection, &mut logs, "cancellation").unwrap();

        assert_eq!(is_ledger_fixed(&connection, "cancellation"), Ok(true));
    }
}
