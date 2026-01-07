use chrono::{NaiveDateTime, TimeDelta};
use repository::{
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository, StockLineLedgerRow},
    EqualFilter, InvoiceRow, InvoiceRowRepository, StorageConnection,
};

use crate::ledger_fix::{fixes::LedgerFixError, ledger_balance_summary, LedgerBalanceSummary};

const MAX_ITERATIONS: i32 = 100;

pub(crate) fn fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting adjust_historic_incoming_invoices\n");

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

    let should_adjust = available + reserved_not_picked == total && total == running_balance;

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for adjust_historic_incoming_invoices {:?}.\n",
            balance_summary
        ));
        return Ok(());
    }

    let mut iteration = 0;
    loop {
        iteration = iteration + 1;
        if iteration > MAX_ITERATIONS {
            return LedgerFixError::other(
                "Too many iterations, breaking to avoid infinite loop.\n",
            );
        }
        let ledger_lines = StockLineLedgerRepository::new(connection).query_by_filter(
            StockLineLedgerFilter::new()
                .stock_line_id(EqualFilter::equal_to(stock_line_id.to_string())),
        )?;

        if ledger_lines.is_empty() {
            operation_log.push_str("No ledger lines found, nothing to adjust.\n");
            return Ok(());
        }

        if ledger_lines.iter().all(|line| line.running_balance > 0.0) {
            operation_log.push_str(if iteration == 1 {
                "No historic ledger discrepancies found.\n"
            } else {
                "No more historic ledger discrepancies found.\n"
            });
            return Ok(());
        }

        let mut ledger_line_to_adjust = None;
        let mut backdate_datetime = None;

        for ledger_line in ledger_lines.iter() {
            match ledger_line.quantity < 0.0 {
                true => {
                    if ledger_line.running_balance < 0.0 && backdate_datetime.is_none() {
                        backdate_datetime = Some(ledger_line.datetime);
                    }
                }
                false => {
                    if backdate_datetime.is_some() {
                        ledger_line_to_adjust = Some(ledger_line.clone());
                        break;
                    }
                }
            }
        }

        let (Some(invoice_to_adjust), Some(backdate_datetime)) =
            (ledger_line_to_adjust, backdate_datetime)
        else {
            operation_log.push_str(&format!(
                "No invoice to adjust found and backdate date is {:?}.\n",
                backdate_datetime
            ));
            break;
        };

        // Make sure incoming stock is a little bit before outgoing stock
        let Some(backdate_datetime) = backdate_datetime.checked_sub_signed(TimeDelta::seconds(1))
        else {
            return LedgerFixError::other("Failed to adjust datetime by 1 second");
        };

        backdate_invoice(
            connection,
            operation_log,
            &invoice_to_adjust,
            backdate_datetime,
        )?;
    }
    Ok(())
}

fn backdate_invoice(
    connection: &StorageConnection,
    operation_log: &mut String,
    invoice_to_adjust: &StockLineLedgerRow,
    backdate_datetime: NaiveDateTime,
) -> Result<(), LedgerFixError> {
    operation_log.push_str(&format!(
        "Backdating invoice {} to {:?}\n",
        invoice_to_adjust.id, backdate_datetime
    ));

    let repo = InvoiceRowRepository::new(connection);

    let Some(invoice_row) = repo.find_one_by_id(&invoice_to_adjust.invoice_id)? else {
        return LedgerFixError::other("Invoice not found");
    };

    let new_invoice_row = InvoiceRow {
        id: invoice_row.id.clone(),
        created_datetime: backdate_datetime,
        allocated_datetime: invoice_row.allocated_datetime.map(|_| backdate_datetime),
        picked_datetime: invoice_row.picked_datetime.map(|_| backdate_datetime),
        shipped_datetime: invoice_row.shipped_datetime.map(|_| backdate_datetime),
        delivered_datetime: invoice_row.delivered_datetime.map(|_| backdate_datetime),
        received_datetime: invoice_row.received_datetime.map(|_| backdate_datetime),
        verified_datetime: invoice_row.verified_datetime.map(|_| backdate_datetime),
        status: invoice_row.status,
        ..invoice_row
    };

    repo.upsert_one(&new_invoice_row)?;

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
        KeyValueStoreRepository, StockLineRow,
    };

    pub(crate) fn mock_data() -> MockData {
        let single_historic_negative_balance = StockLineRow {
            id: "single_historic_negative_balance".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            ..Default::default()
        };

        let multiple_historic_negative_balances = StockLineRow {
            id: "multiple_historic_negative_balances".to_string(),
            ..single_historic_negative_balance.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![
                single_historic_negative_balance.clone(),
                multiple_historic_negative_balances.clone(),
            ],
            ..Default::default()
        }
        // Movements are (date as day, quantity)
        .join(make_movements(
            single_historic_negative_balance,
            vec![(3, -2), (5, -3), (7, 6), (25, -1)],
        ))
        .join(make_movements(
            multiple_historic_negative_balances,
            vec![(3, -2), (5, -5), (7, 6), (25, -1), (30, 2)],
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

        assert_eq!(
            is_ledger_fixed(&connection, "single_historic_negative_balance"),
            Ok(false)
        );

        let mut logs = String::new();

        fix(&connection, &mut logs, "single_historic_negative_balance").unwrap();

        assert_eq!(
            is_ledger_fixed(&connection, "single_historic_negative_balance"),
            Ok(true)
        );

        assert_eq!(
            is_ledger_fixed(&connection, "multiple_historic_negative_balances"),
            Ok(false)
        );

        let mut logs = String::new();

        fix(
            &connection,
            &mut logs,
            "multiple_historic_negative_balances",
        )
        .unwrap();

        assert_eq!(
            is_ledger_fixed(&connection, "multiple_historic_negative_balances"),
            Ok(true)
        );
    }
}
