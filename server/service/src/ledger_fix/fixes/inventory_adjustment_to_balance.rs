use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository, StockLineLedgerRow},
    EqualFilter, InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineType, InvoiceRow,
    InvoiceRowRepository, InvoiceStatus, InvoiceType, ItemRowRepository, NameRowRepository,
    NumberRowType, RepositoryError, StockLineRowRepository, StorageConnection,
};
use util::{
    constants::{INVENTORY_ADJUSTMENT_NAME_CODE, SYSTEM_USER_ID},
    uuid::uuid,
};

use crate::{
    ledger_fix::{
        fixes::{is_omsupply_uuid, LedgerFixError},
        ledger_balance_summary, LedgerBalanceSummary,
    },
    number::next_number,
};

pub(crate) fn inventory_adjustment_to_balance(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting inventory_adjustment_to_balance\n");

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
        && !is_omsupply_uuid(stock_line_id);

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for inventory_adjustment_to_balance {:?}.\n",
            balance_summary
        ));
        return Ok(());
    }

    let adjustment = running_balance * -1.0;
    // If adjustment is positive, we can add positive adjustment at the start of the ledger safely (without causing negative balance)
    if adjustment > 0.0 {
        operation_log.push_str(
            "Adjustment is positive, adding positive adjustment at the start of the ledger.\n",
        );
        adjust(
            connection,
            operation_log,
            ledger_lines.first(),
            adjustment,
            stock_line_id,
        )?;

        return Ok(());
    }

    // if adjustment is negative we need to add negative adjustment as far back in history as possible (without causing negative balance)
    let mut backdate_at_ledger_line = None;

    for ledger_line in ledger_lines.iter().rev() {
        if ledger_line.running_balance + adjustment < 0.0 {
            break;
        }
        backdate_at_ledger_line = Some(ledger_line);
    }

    operation_log.push_str("Adjustment is negative, adding negative inventory adjustment.\n");

    adjust(
        connection,
        operation_log,
        backdate_at_ledger_line.or(ledger_lines.last()),
        adjustment,
        stock_line_id,
    )?;

    Ok(())
}

fn adjust(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_ledger_row: Option<&StockLineLedgerRow>,
    adjustment: f64,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    let Some(StockLineLedgerRow {
        item_id,
        store_id,
        datetime,
        ..
    }) = stock_line_ledger_row.map(|r| r.clone())
    else {
        return LedgerFixError::other("Ledger line should exist for adjustment");
    };

    let inventory_adjustment_id = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)?
        .ok_or(RepositoryError::NotFound)?
        .id;

    let Some(item) = ItemRowRepository::new(connection).find_one_by_id(&item_id)? else {
        return LedgerFixError::other("Item not found for inventory adjustment");
    };

    let Some(stock_line) =
        StockLineRowRepository::new(connection).find_one_by_id(&stock_line_id)?
    else {
        return LedgerFixError::other("Stock line not found for inventory adjustment");
    };

    operation_log.push_str(&format!(
        "Adding {adjustment} adjustment for date {datetime:?}.\n"
    ));

    let (invoice_type, number_type, invoice_line_type) = if adjustment > 0.0 {
        (
            InvoiceType::InventoryAddition,
            NumberRowType::InventoryAddition,
            InvoiceLineType::StockIn,
        )
    } else {
        (
            InvoiceType::InventoryReduction,
            NumberRowType::InventoryReduction,
            InvoiceLineType::StockOut,
        )
    };

    let invoice_number = next_number(connection, &number_type, &store_id)?;

    // Similar to stock take
    let adjustment_invoice = InvoiceRow {
        id: uuid(),
        name_link_id: inventory_adjustment_id,
        r#type: invoice_type,
        status: InvoiceStatus::Verified,
        store_id,
        user_id: Some(SYSTEM_USER_ID.to_string()),
        invoice_number,
        comment: Some(format!(
            "Ledger balance for stock line batch {} id {}",
            stock_line.batch.unwrap_or_default(),
            stock_line_id
        )),
        created_datetime: datetime,
        verified_datetime: Some(datetime),
        ..Default::default()
    };

    let line = InvoiceLineRow {
        id: uuid(),
        invoice_id: adjustment_invoice.id.clone(),
        item_link_id: item_id,
        item_name: item.name,
        item_code: item.code,
        stock_line_id: Some(stock_line.id),
        r#type: invoice_line_type,
        number_of_packs: adjustment.abs() / stock_line.pack_size,
        pack_size: stock_line.pack_size,
        ..Default::default()
    };

    InvoiceRowRepository::new(connection).upsert_one(&adjustment_invoice)?;

    InvoiceLineRowRepository::new(connection).upsert_one(&line)?;

    Ok(())
}

#[cfg(test)]
mod test {
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

    fn mock_data() -> MockData {
        let positive_running_balance_fix = StockLineRow {
            id: "positive_running_balance_fix".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        let negative_running_balance_fix = StockLineRow {
            id: "negative_running_balance_fix".to_string(),
            ..positive_running_balance_fix.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![
                positive_running_balance_fix.clone(),
                negative_running_balance_fix.clone(),
            ],
            ..Default::default()
        }
        // Movements are (date as day, quantity)
        .join(make_movements(
            positive_running_balance_fix,
            vec![(2, 6), (3, -6), (4, 6), (5, -3), (25, -2)],
        ))
        .join(make_movements(
            negative_running_balance_fix,
            vec![(2, 6), (3, -6), (4, 6), (5, -3), (25, -2), (28, -10)],
        ));

        mock_data
    }

    #[actix_rt::test]
    async fn adjust_historic_incoming_invoices_test() {
        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "adjust_historic_incoming_invoices",
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

        let repo = StockLineLedgerRepository::new(&connection);

        assert_eq!(
            is_ledger_fixed(&connection, "positive_running_balance_fix"),
            Ok(false)
        );

        let mut logs = String::new();

        inventory_adjustment_to_balance(&connection, &mut logs, "positive_running_balance_fix")
            .unwrap();

        assert_eq!(
            is_ledger_fixed(&connection, "positive_running_balance_fix"),
            Ok(true)
        );

        assert_eq!(
            repo.query_by_filter(
                StockLineLedgerFilter::new()
                    .stock_line_id(EqualFilter::equal_to("positive_running_balance_fix"))
            )
            .unwrap()
            .into_iter()
            .map(|line| line.running_balance)
            .collect::<Vec<f64>>(),
            vec![6.0, 0.0, 6.0, 5.0, 2.0, 0.0]
        );

        assert_eq!(
            is_ledger_fixed(&connection, "negative_running_balance_fix"),
            Ok(false)
        );

        let mut logs = String::new();

        inventory_adjustment_to_balance(&connection, &mut logs, "negative_running_balance_fix")
            .unwrap();

        assert_eq!(
            repo.query_by_filter(
                StockLineLedgerFilter::new()
                    .stock_line_id(EqualFilter::equal_to("negative_running_balance_fix"))
            )
            .unwrap()
            .into_iter()
            .map(|line| line.running_balance)
            .collect::<Vec<f64>>(),
            // There is a chance this test could fail because incoming invoices have the same datetime
            vec![6.0, 15.0, 9.0, 15.0, 12.0, 10.0, 0.0]
        );

        assert_eq!(
            is_ledger_fixed(&connection, "negative_running_balance_fix"),
            Ok(true)
        );
    }
}
