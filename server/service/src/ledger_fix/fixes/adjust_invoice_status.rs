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
                desc: Some(true),
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
                    }
                    operation_log.push_str(&format!("Adjusting invoice {invoice_id} status {invoice_status:?} to match latest log status: {log_status:?}.\n", invoice_id = invoice.id));
                    InvoiceRowRepository::new(connection).upsert_one(invoice)?;
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
            make_movements, setup_all_with_data_and_service_provider, ServiceTestContext,
        },
    };
    use repository::{
        mock::{mock_item_a, mock_store_a, MockData, MockDataInserts},
        InvoiceStatus, KeyValueStoreRepository, StockLineRow,
    };

    fn mock_data() -> MockData {
        let total_does_not_match = StockLineRow {
            id: "total_does_not_match".to_string(),
            item_link_id: mock_item_a().id.clone(),
            store_id: mock_store_a().id.clone(),
            pack_size: 1.0,
            available_number_of_packs: 40.0,
            total_number_of_packs: 30.0,
            ..Default::default()
        };

        let an_invoice_where_status_changed = StockLineRow {
            id: "an_invoice_where_status_changed".to_string(),
            available_number_of_packs: 20.0,
            ..total_does_not_match.clone()
        };

        let mock_data = MockData {
            stock_lines: vec![
                total_does_not_match.clone(),
                an_invoice_where_status_changed.clone(),
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
            an_invoice_where_status_changed,
            vec![(2, 100), (3, -50), (4, -10), (10, -20)],
        );

        let logs_mock = MockData {
            activity_logs: mock_data
                .invoices
                .iter()
                .flat_map(|invoice| {
                    let mut logs = Vec::new();

                    logs.push(ActivityLogRow {
                        id: format!("{}_created", invoice.id),
                        r#type: ActivityLogType::InvoiceCreated,
                        user_id: Some("user_account_a".to_string()),
                        store_id: Some(invoice.store_id.clone()),
                        record_id: Some(invoice.id.clone()),
                        datetime: invoice.created_datetime.clone(),
                        changed_to: None,
                        changed_from: None,
                    });

                    if let Some(allocated_datetime) = invoice.allocated_datetime {
                        logs.push(ActivityLogRow {
                            id: format!("{}_allocated", invoice.id),
                            r#type: ActivityLogType::InvoiceStatusAllocated,
                            user_id: Some("user_account_a".to_string()),
                            store_id: Some(invoice.store_id.clone()),
                            record_id: Some(invoice.id.clone()),
                            datetime: allocated_datetime.clone(),
                            changed_to: None,
                            changed_from: None,
                        });
                    }

                    if let Some(picked_datetime) = invoice.picked_datetime {
                        logs.push(ActivityLogRow {
                            id: format!("{}_picked", invoice.id),
                            r#type: ActivityLogType::InvoiceStatusPicked,
                            user_id: Some("user_account_a".to_string()),
                            store_id: Some(invoice.store_id.clone()),
                            record_id: Some(invoice.id.clone()),
                            datetime: picked_datetime.clone(),
                            changed_to: None,
                            changed_from: None,
                        });
                    }

                    if let Some(shipped_datetime) = invoice.shipped_datetime {
                        logs.push(ActivityLogRow {
                            id: format!("{}_shipped", invoice.id),
                            r#type: ActivityLogType::InvoiceStatusShipped,
                            user_id: Some("user_account_a".to_string()),
                            store_id: Some(invoice.store_id.clone()),
                            record_id: Some(invoice.id.clone()),
                            datetime: shipped_datetime.clone(),
                            changed_to: None,
                            changed_from: None,
                        });
                    }

                    if let Some(delivered_datetime) = invoice.delivered_datetime {
                        logs.push(ActivityLogRow {
                            id: format!("{}_delivered", invoice.id),
                            r#type: ActivityLogType::InvoiceStatusDelivered,
                            user_id: Some("user_account_a".to_string()),
                            store_id: Some(invoice.store_id.clone()),
                            record_id: Some(invoice.id.clone()),
                            datetime: delivered_datetime.clone(),
                            changed_to: None,
                            changed_from: None,
                        });
                    }

                    if let Some(received_datetime) = invoice.received_datetime {
                        logs.push(ActivityLogRow {
                            id: format!("{}_received", invoice.id),
                            r#type: ActivityLogType::InvoiceStatusReceived,
                            user_id: Some("user_account_a".to_string()),
                            store_id: Some(invoice.store_id.clone()),
                            record_id: Some(invoice.id.clone()),
                            datetime: received_datetime.clone(),
                            changed_to: None,
                            changed_from: None,
                        });
                    }

                    if let Some(verified_datetime) = invoice.verified_datetime {
                        logs.push(ActivityLogRow {
                            id: format!("{}_verified", invoice.id),
                            r#type: ActivityLogType::InvoiceStatusVerified,
                            user_id: Some("user_account_a".to_string()),
                            store_id: Some(invoice.store_id.clone()),
                            record_id: Some(invoice.id.clone()),
                            datetime: verified_datetime.clone(),
                            changed_to: None,
                            changed_from: None,
                        });
                    }

                    if let Some(cancelled_datetime) = invoice.cancelled_datetime {
                        logs.push(ActivityLogRow {
                            id: format!("{}_cancelled", invoice.id),
                            r#type: ActivityLogType::InvoiceStatusCancelled,
                            user_id: Some("user_account_a".to_string()),
                            store_id: Some(invoice.store_id.clone()),
                            record_id: Some(invoice.id.clone()),
                            datetime: cancelled_datetime.clone(),
                            changed_to: None,
                            changed_from: None,
                        });
                    }

                    logs
                })
                .collect(),
            ..Default::default()
        };

        // Add reserved not picked
        allocated_not_picked_movements.invoices[1].status = InvoiceStatus::Allocated;
        allocated_not_picked_movements.invoices[1].picked_datetime = None;
        allocated_not_picked_movements.invoices[1].shipped_datetime = None;
        allocated_not_picked_movements.invoices[1].received_datetime = None;
        allocated_not_picked_movements.invoices[1].verified_datetime = None;

        mock_data
            .join(allocated_not_picked_movements)
            .join(logs_mock)
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
            Ok(false)
        );

        assert_eq!(
            is_ledger_fixed(&connection, "an_invoice_where_status_changed"),
            Ok(false)
        );
        let mut logs = String::new();
        fix(&connection, &mut logs, "an_invoice_where_status_changed").unwrap();
        assert_eq!(
            is_ledger_fixed(&connection, "an_invoice_where_status_changed"),
            Ok(true)
        );

        assert_eq!(
            is_ledger_fixed(
                &connection,
                "an_invoice_where_status_change_is_duplicated_in_logs"
            ),
            Ok(false)
        );
        let mut logs = String::new();
        fix(
            &connection,
            &mut logs,
            "an_invoice_where_status_change_is_duplicated_in_logs",
        )
        .unwrap();
        assert_eq!(
            is_ledger_fixed(
                &connection,
                "an_invoice_where_status_change_is_duplicated_in_logs"
            ),
            Ok(false)
        );
    }
}
