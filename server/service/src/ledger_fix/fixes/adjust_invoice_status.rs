use repository::{
    activity_log::{
        ActivityLogFilter, ActivityLogRepository, ActivityLogSort, ActivityLogSortField,
    },
    stock_line_ledger::{StockLineLedgerFilter, StockLineLedgerRepository},
    ActivityLogRow, ActivityLogType, EqualFilter, InvoiceLineFilter, InvoiceLineRepository,
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, Pagination, StockLineRowRepository,
    StorageConnection,
};

use crate::ledger_fix::{fixes::LedgerFixError, ledger_balance_summary, LedgerBalanceSummary};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Ord, PartialOrd)] // Wanted to use InvoiceStatus, but need a good "other" variant
enum Status {
    New,
    Allocated,
    Picked,
    Shipped,
    Delivered,
    Received,
    Verified,
    Cancelled,
    Other,
}

impl From<ActivityLogType> for Status {
    fn from(log_type: ActivityLogType) -> Self {
        match log_type {
            ActivityLogType::InvoiceCreated => Status::New,
            ActivityLogType::InvoiceStatusAllocated => Status::Allocated,
            ActivityLogType::InvoiceStatusPicked => Status::Picked,
            ActivityLogType::InvoiceStatusShipped => Status::Shipped,
            ActivityLogType::InvoiceStatusDelivered => Status::Delivered,
            ActivityLogType::InvoiceStatusReceived => Status::Received,
            ActivityLogType::InvoiceStatusVerified => Status::Verified,
            ActivityLogType::InvoiceStatusCancelled => Status::Cancelled,
            _ => Status::Other, // This isn't ideal, if someone adds more types the type system won't force us to add it here...
        }
    }
}

impl From<InvoiceStatus> for Status {
    fn from(status: InvoiceStatus) -> Self {
        match status {
            InvoiceStatus::New => Status::New,
            InvoiceStatus::Allocated => Status::Allocated,
            InvoiceStatus::Picked => Status::Picked,
            InvoiceStatus::Shipped => Status::Shipped,
            InvoiceStatus::Received => Status::Received,
            InvoiceStatus::Delivered => Status::Delivered,
            InvoiceStatus::Verified => Status::Verified,
            InvoiceStatus::Cancelled => Status::Cancelled,
        }
    }
}

pub(crate) fn fix(
    connection: &StorageConnection,
    operation_log: &mut String,
    stock_line_id: &str,
) -> Result<(), LedgerFixError> {
    operation_log.push_str("Starting adjust_invoice_status\n");

    let ledger_lines = StockLineLedgerRepository::new(connection).query_by_filter(
        StockLineLedgerFilter::new().stock_line_id(EqualFilter::equal_to(stock_line_id)),
    )?;

    let balance_summary = ledger_balance_summary(connection, &ledger_lines, stock_line_id)?;
    let LedgerBalanceSummary {
        total,
        running_balance,
        available,
        reserved_not_picked,
        ..
    } = balance_summary;

    let should_adjust = total != running_balance || available + reserved_not_picked != total;

    if !should_adjust {
        operation_log.push_str(&format!(
            "Ledger does not match use case for adjust_invoice_status {:?}.\n",
            balance_summary
        ));

        return Ok(());
    }
    // Get stock_line -> invoice_lines -> invoices, the `activity_logs` corresponding to each, then check
    // the latest status against invoice.status
    if StockLineRowRepository::new(connection)
        .find_one_by_id(stock_line_id)?
        .is_none()
    {
        return LedgerFixError::other("Stock line not found");
    };

    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new().stock_line_id(EqualFilter::equal_to(stock_line_id)),
    )?;

    if invoice_lines.is_empty() {
        operation_log.push_str(&format!(
            "Ledger does not match use case as for adjust_invoice_status- there are no related invoice lines\n",
        ));
        return Ok(());
    }

    let mut invoices: Vec<InvoiceRow> = invoice_lines.into_iter().map(|l| l.invoice_row).collect();
    invoices.sort_by(|a, b| a.id.cmp(&b.id));
    invoices.dedup_by(|a, b| a.id == b.id);

    'invoice_loop: for invoice in &mut invoices {
        let logs = ActivityLogRepository::new(connection).query(
            Pagination::all(),
            Some(ActivityLogFilter::new().record_id(EqualFilter::equal_to(&invoice.id))),
            Some(ActivityLogSort {
                key: ActivityLogSortField::Datetime,
                desc: None,
            }),
        )?;

        let logs: Vec<ActivityLogRow> = logs
            .into_iter()
            .filter(|l| {
                matches!(
                    l.activity_log_row.r#type,
                    ActivityLogType::InvoiceCreated
                        | ActivityLogType::InvoiceStatusAllocated
                        | ActivityLogType::InvoiceStatusPicked
                        | ActivityLogType::InvoiceStatusShipped
                        | ActivityLogType::InvoiceStatusDelivered
                        | ActivityLogType::InvoiceStatusReceived
                        | ActivityLogType::InvoiceStatusVerified
                        | ActivityLogType::InvoiceStatusCancelled
                )
            })
            .map(|l| l.activity_log_row)
            .collect();

        // Check for duplicate statuses, skip to next invoice if found
        let mut seen_statuses = std::collections::HashSet::new();
        for log in &logs {
            if let ActivityLogType::InvoiceStatusAllocated
            | ActivityLogType::InvoiceStatusPicked
            | ActivityLogType::InvoiceStatusShipped
            | ActivityLogType::InvoiceStatusDelivered
            | ActivityLogType::InvoiceStatusReceived
            | ActivityLogType::InvoiceStatusVerified
            | ActivityLogType::InvoiceStatusCancelled = log.r#type
            {
                if !seen_statuses.insert(log.r#type) {
                    continue 'invoice_loop; // Skip to next invoice
                }
            }
        }

        // Recover invoice datetime values from corresponding logs
        for log in &logs {
            let date_field = match log.r#type {
                ActivityLogType::InvoiceStatusAllocated => &mut invoice.allocated_datetime,
                ActivityLogType::InvoiceStatusPicked => &mut invoice.picked_datetime,
                ActivityLogType::InvoiceStatusShipped => &mut invoice.shipped_datetime,
                ActivityLogType::InvoiceStatusDelivered => &mut invoice.delivered_datetime,
                ActivityLogType::InvoiceStatusReceived => &mut invoice.received_datetime,
                ActivityLogType::InvoiceStatusVerified => &mut invoice.verified_datetime,
                ActivityLogType::InvoiceStatusCancelled => &mut invoice.cancelled_datetime,
                _ => continue,
            };
            date_field.get_or_insert(log.datetime);
        }

        if let Some(log) = logs.last() {
            match log.r#type {
                ActivityLogType::InvoiceStatusAllocated
                | ActivityLogType::InvoiceStatusPicked
                | ActivityLogType::InvoiceStatusShipped
                | ActivityLogType::InvoiceStatusDelivered
                | ActivityLogType::InvoiceStatusReceived
                | ActivityLogType::InvoiceStatusVerified
                | ActivityLogType::InvoiceStatusCancelled => {
                    let log_status: Status = log.r#type.into();
                    let invoice_status: Status = invoice.status.into();
                    if invoice_status < log_status {
                        invoice.status = match log.r#type {
                            ActivityLogType::InvoiceStatusAllocated => InvoiceStatus::Allocated,
                            ActivityLogType::InvoiceStatusPicked => InvoiceStatus::Picked,
                            ActivityLogType::InvoiceStatusShipped => InvoiceStatus::Shipped,
                            ActivityLogType::InvoiceStatusDelivered => InvoiceStatus::Delivered,
                            ActivityLogType::InvoiceStatusReceived => InvoiceStatus::Received,
                            ActivityLogType::InvoiceStatusVerified => InvoiceStatus::Verified,
                            ActivityLogType::InvoiceStatusCancelled => InvoiceStatus::Cancelled,
                            _ => {
                                continue;
                            }
                        };
                        operation_log.push_str(&format!("Adjusting invoice {invoice_id} status {invoice_status:?} to match latest log status: {log_status:?}.\n", invoice_id = invoice.id));
                        InvoiceRowRepository::new(connection).upsert_one(invoice)?;
                    }
                }
                _ => continue,
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod test {
    use super::*;
    use crate::{
        ledger_fix::is_ledger_fixed,
        test_helpers::{
            invoice_generate_logs, make_movements, setup_all_with_data_and_service_provider,
            ServiceTestContext,
        },
    };
    use repository::{
        mock::{mock_item_a, mock_store_a, MockData, MockDataInserts},
        InvoiceStatus, KeyValueStoreRepository, StockLineRow,
    };

    #[actix_rt::test]
    async fn test_ledger_fix_adjust_invoice_status() {
        // No status change so should not be fixed by this ledger fix
        let total_does_not_match = StockLineRow {
            id: "total_does_not_match".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            available_number_of_packs: 40.0,
            total_number_of_packs: 30.0,
            ..Default::default()
        };
        // Movements are (date as day, quantity)
        let total_does_not_match_movements = make_movements(
            total_does_not_match.clone(),
            // -10 was double picked
            vec![(2, 100), (3, -50), (4, -10)],
        );

        // Invoice changed status and should be fixed by this ledger fix
        let an_invoice_where_status_changed = StockLineRow {
            id: "an_invoice_where_status_changed".to_string(),
            pack_size: 1.0,
            total_number_of_packs: 100.0,
            available_number_of_packs: 100.0,
            ..total_does_not_match.clone()
        };
        let mut an_invoice_where_status_changed_movements =
            make_movements(an_invoice_where_status_changed.clone(), vec![(1, 100)]);
        // make logs before munging datetime fields on invoices
        an_invoice_where_status_changed_movements.activity_logs =
            an_invoice_where_status_changed_movements
                .invoices
                .iter()
                .flat_map(invoice_generate_logs)
                .collect();
        let invoice = &mut an_invoice_where_status_changed_movements.invoices[0];
        let invoice_status_changed_id = &invoice.id.clone();
        let old_delivered_datetime = invoice.delivered_datetime.clone();
        let old_received_datetime = invoice.received_datetime.clone();
        let old_verified_datetime = invoice.verified_datetime.clone();
        invoice.status = InvoiceStatus::Allocated;
        invoice.delivered_datetime = None;
        invoice.received_datetime = None;
        invoice.verified_datetime = None;

        // Invoice changed status, but user changed status again creating duplicate in logs. Should not get fixed.
        let an_invoice_where_status_changed_duplicate_status = StockLineRow {
            id: "an_invoice_where_status_changed_duplicate_status".to_string(),
            ..an_invoice_where_status_changed.clone()
        };
        let mut duplicate_status_movements = make_movements(
            an_invoice_where_status_changed_duplicate_status.clone(),
            vec![(1, 100)],
        );
        // make logs before munging datetime fields on invoices
        duplicate_status_movements.activity_logs = duplicate_status_movements
            .invoices
            .iter()
            .flat_map(invoice_generate_logs)
            .collect();
        let invoice = &mut duplicate_status_movements.invoices[0];
        let invoice_duplicate_status_id = &invoice.id.clone();
        invoice.status = InvoiceStatus::Delivered;
        invoice.received_datetime = None;
        invoice.verified_datetime = None;
        duplicate_status_movements.activity_logs.push({
            ActivityLogRow {
                id: "duplicate_delivered_status".to_string(),
                ..duplicate_status_movements.activity_logs[1].clone() // Should be the delivered log from the first time.
            }
        });

        let mock_data = MockData {
            stock_lines: vec![
                total_does_not_match.clone(),
                an_invoice_where_status_changed.clone(),
                an_invoice_where_status_changed_duplicate_status.clone(),
            ],
            ..Default::default()
        }
        .join(total_does_not_match_movements)
        .join(an_invoice_where_status_changed_movements)
        .join(duplicate_status_movements);

        let ServiceTestContext { connection, .. } = setup_all_with_data_and_service_provider(
            "test_ledger_fix_adjust_invoice_status",
            MockDataInserts::none().names().stores().units().items(),
            mock_data,
        )
        .await;

        KeyValueStoreRepository::new(&connection)
            .set_i32(
                repository::KeyType::SettingsSyncSiteId,
                Some(mock_store_a().site_id),
            )
            .unwrap();

        let mut logs = String::new();
        let invoice_id = &total_does_not_match.id;
        assert_eq!(is_ledger_fixed(&connection, invoice_id), Ok(false));
        fix(&connection, &mut logs, invoice_id).unwrap();
        assert_eq!(is_ledger_fixed(&connection, invoice_id), Ok(false));

        let stock_line_id = &an_invoice_where_status_changed.id;
        let invoice_id = invoice_status_changed_id;
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(invoice_id)
            .unwrap()
            .unwrap();
        assert!(invoice.delivered_datetime.is_none());
        assert!(invoice.received_datetime.is_none());
        assert!(invoice.verified_datetime.is_none());
        assert_eq!(is_ledger_fixed(&connection, stock_line_id), Ok(false));
        fix(&connection, &mut logs, stock_line_id).unwrap();
        assert_eq!(is_ledger_fixed(&connection, stock_line_id), Ok(true));
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(invoice_id)
            .unwrap()
            .unwrap();
        assert_eq!(
            invoice.delivered_datetime, old_delivered_datetime,
            "delivered_datetime should have been recovered from activity log"
        );
        assert_eq!(
            invoice.received_datetime, old_received_datetime,
            "received_datetime should have been recovered from activity log"
        );
        assert_eq!(
            invoice.verified_datetime, old_verified_datetime,
            "verified_datetime should have been recovered from activity log"
        );

        let stock_line_id = &an_invoice_where_status_changed_duplicate_status.id;
        let invoice_id = invoice_duplicate_status_id;
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(invoice_id)
            .unwrap()
            .unwrap();
        assert!(invoice.delivered_datetime.is_some());
        assert!(invoice.received_datetime.is_none());
        assert!(invoice.verified_datetime.is_none());
        assert_eq!(is_ledger_fixed(&connection, stock_line_id), Ok(false));
        fix(&connection, &mut logs, stock_line_id).unwrap();
        assert_eq!(is_ledger_fixed(&connection, stock_line_id), Ok(false));
        let invoice = InvoiceRowRepository::new(&connection)
            .find_one_by_id(invoice_id)
            .unwrap()
            .unwrap();
        assert!(invoice.delivered_datetime.is_some());
        assert!(invoice.received_datetime.is_none());
        assert!(invoice.verified_datetime.is_none());
    }
}
