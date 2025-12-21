use std::error::Error;

use chrono::{NaiveDateTime, Utc};
use repository::{
    activity_log::{ActivityLog, ActivityLogFilter, ActivityLogRepository, ActivityLogSort},
    system_log_row::{SystemLogRow, SystemLogRowRepository, SystemLogType},
    ActivityLogRow, ActivityLogRowRepository, ActivityLogType, InvoiceStatus, KeyType,
    KeyValueStoreRepository, PurchaseOrderStatus, StorageConnection, StorageConnectionManager,
};

use repository::{PaginationOption, RepositoryError};
use util::serde_json_diff::json_diff;
use util::uuid::uuid;
use util::{constants::SYSTEM_USER_ID, format_error};

use crate::service_provider::ServiceContext;

use super::{get_pagination_or_default, i64_to_u32, ListError, ListResult};

pub fn get_activity_logs(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<ActivityLogFilter>,
    sort: Option<ActivityLogSort>,
) -> Result<ListResult<ActivityLog>, ListError> {
    let pagination = get_pagination_or_default(pagination)?;
    let connection = connection_manager.connection()?;
    let repository = ActivityLogRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn activity_log_entry(
    ctx: &ServiceContext,
    log_type: ActivityLogType,
    record_id: Option<String>,
    changed_from: Option<String>,
    changed_to: Option<String>,
) -> Result<(), RepositoryError> {
    let log = &ActivityLogRow {
        id: uuid(),
        r#type: log_type,
        user_id: if !ctx.user_id.is_empty() {
            Some(ctx.user_id.clone())
        } else {
            None
        },
        store_id: if !ctx.store_id.is_empty() {
            Some(ctx.store_id.clone())
        } else {
            None
        },
        record_id,
        datetime: Utc::now().naive_utc(),
        changed_to,
        changed_from,
    };

    let _change_log_id = ActivityLogRowRepository::new(&ctx.connection).insert_one(log)?;
    Ok(())
}

/// Use instead of `activity_log_entry()` to provide the store_id if the ctx doesn't include it (e.g. system or basic context used in changelog processors)
pub fn activity_log_entry_with_store(
    ctx: &ServiceContext,
    log_type: ActivityLogType,
    record_id: Option<String>,
    changed_from: Option<String>,
    changed_to: Option<String>,
    store_id: Option<String>,
) -> Result<(), RepositoryError> {
    let log = &ActivityLogRow {
        id: uuid(),
        r#type: log_type,
        user_id: if !ctx.user_id.is_empty() {
            Some(ctx.user_id.clone())
        } else {
            None
        },
        store_id,
        record_id,
        datetime: Utc::now().naive_utc(),
        changed_to,
        changed_from,
    };

    let _change_log_id = ActivityLogRowRepository::new(&ctx.connection).insert_one(log)?;
    Ok(())
}

pub fn activity_log_entry_with_diff(
    ctx: &ServiceContext,
    log_type: ActivityLogType,
    record_id: Option<String>,
    old_value: Option<&impl serde::Serialize>,
    new_value: &impl serde::Serialize,
) -> Result<(), RepositoryError> {
    // Create a diff showing only the changes
    let (changed_from, changed_to) = match old_value {
        Some(old) => {
            match json_diff(&old, &new_value).map_err(|e| RepositoryError::DBError {
                msg: format!("{:?}", e),
                extra: "JSON diff error".to_string(),
            })? {
                Some((from, to)) => (
                    Some(serde_json::to_string(&from).unwrap_or_default()),
                    Some(serde_json::to_string(&to).unwrap_or_default()),
                ),
                None => (None, None), // No changes
            }
        }
        None => (
            None,
            Some(serde_json::to_string(&new_value).unwrap_or_default()),
        ),
    };

    activity_log_entry(ctx, log_type, record_id, changed_from, changed_to)
}

pub fn system_activity_log_entry(
    connection: &StorageConnection,
    log_type: ActivityLogType,
    store_id: &str,
    record_id: &str,
) -> Result<(), RepositoryError> {
    let log = &ActivityLogRow {
        id: uuid(),
        r#type: log_type,
        user_id: Some(SYSTEM_USER_ID.to_string()),
        store_id: Some(store_id.to_string()),
        record_id: Some(record_id.to_string()),
        datetime: Utc::now().naive_utc(),
        changed_from: None,
        changed_to: None,
    };

    let _change_log_id = ActivityLogRowRepository::new(connection).insert_one(log)?;
    Ok(())
}

pub enum SystemLogMessage<'a> {
    Error(&'a dyn Error, &'a str),
    Message(&'a str),
}

pub fn system_log_entry(
    connection: &StorageConnection,
    log_type: SystemLogType,
    datetime: Option<NaiveDateTime>,
    should_log_to_console: bool,
    message: SystemLogMessage,
) -> Result<(), RepositoryError> {
    let sync_site_id =
        KeyValueStoreRepository::new(connection).get_i32(KeyType::SettingsSyncSiteId)?;

    let message = match { message } {
        SystemLogMessage::Error(error, context) => {
            format!(
                "{} - {} - {}",
                context,
                log_type.to_string(),
                format_error(&error)
            )
        }
        SystemLogMessage::Message(msg) => msg.to_string(),
    };

    if should_log_to_console {
        if log_type.is_error() {
            log::error!("{message}");
        } else {
            log::info!("{message}");
        }
    }

    let log = &SystemLogRow {
        id: uuid(),
        r#type: log_type.clone(),
        sync_site_id,
        datetime: datetime.unwrap_or(Utc::now().naive_utc()),
        message: Some(message.to_string()),
        is_error: log_type.is_error(),
    };

    let _change_log_id = SystemLogRowRepository::new(connection).insert_one(log)?;
    Ok(())
}

// Will also log in file/console
pub fn system_error_log(
    connection: &StorageConnection,
    log_type: SystemLogType,
    error: &impl Error,
    context: &str,
) -> Result<(), RepositoryError> {
    system_log_entry(
        connection,
        log_type,
        None,
        true,
        SystemLogMessage::Error(error, context),
    )?;
    Ok(())
}

// Will also log in file/console
pub fn system_log(
    connection: &StorageConnection,
    log_type: SystemLogType,
    log: &str,
) -> Result<(), RepositoryError> {
    system_log_entry(
        connection,
        log_type,
        None,
        true,
        SystemLogMessage::Message(log),
    )?;
    Ok(())
}

pub fn add_migration_results_to_system_log(
    connection: &StorageConnection,
    migration_result: Vec<(String, NaiveDateTime)>,
) -> Result<(), RepositoryError> {
    for (message, timestamp) in migration_result {
        system_log_entry(
            connection,
            SystemLogType::Migration,
            Some(timestamp),
            false,
            SystemLogMessage::Message(&message),
        )?;
    }
    Ok(())
}

pub fn log_type_from_invoice_status(status: &InvoiceStatus, prescription: bool) -> ActivityLogType {
    use ActivityLogType as to;
    use InvoiceStatus as from;

    match status {
        from::New => to::InvoiceCreated,
        from::Allocated => to::InvoiceStatusAllocated,
        from::Picked if prescription => to::PrescriptionStatusPicked,
        from::Picked => to::InvoiceStatusPicked,
        from::Shipped => to::InvoiceStatusShipped,
        from::Delivered => to::InvoiceStatusDelivered,
        from::Received => to::InvoiceStatusReceived,
        from::Verified if prescription => to::PrescriptionStatusVerified,
        from::Verified => to::InvoiceStatusVerified,
        from::Cancelled if prescription => to::PrescriptionStatusCancelled,
        from::Cancelled => to::InvoiceStatusCancelled,
    }
}

pub fn log_type_from_purchase_order_status(status: &PurchaseOrderStatus) -> ActivityLogType {
    match status {
        PurchaseOrderStatus::New => ActivityLogType::PurchaseOrderCreated,
        PurchaseOrderStatus::RequestApproval => ActivityLogType::PurchaseOrderRequestApproval,
        PurchaseOrderStatus::Confirmed => ActivityLogType::PurchaseOrderConfirmed,
        PurchaseOrderStatus::Sent => ActivityLogType::PurchaseOrderSent,
        PurchaseOrderStatus::Finalised => ActivityLogType::PurchaseOrderFinalised,
    }
}

#[cfg(test)]
mod test {
    use crate::{
        activity_log::add_migration_results_to_system_log,
        invoice::outbound_shipment::update::{
            UpdateOutboundShipment, UpdateOutboundShipmentStatus,
        },
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };
    use chrono::{NaiveDate, Utc};
    use repository::{
        mock::{mock_name_a, mock_store_a, MockData, MockDataInserts},
        system_log_row::{SystemLogRowRepository, SystemLogType},
        test_db::setup_all,
        ActivityLogType, InvoiceRow, InvoiceStatus, InvoiceType,
    };

    use super::{get_activity_logs, system_log_entry, SystemLogMessage};

    #[actix_rt::test]
    async fn invoice_activity_log_status() {
        let ServiceTestContext {
            service_provider,
            connection_manager,
            ..
        } = setup_all_with_data_and_service_provider(
            "invoice_log",
            MockDataInserts::none().names().stores().currencies(),
            MockData {
                invoices: vec![InvoiceRow {
                    id: "test".to_string(),
                    name_link_id: mock_name_a().id,
                    store_id: mock_store_a().id,
                    r#type: InvoiceType::OutboundShipment,
                    status: InvoiceStatus::Allocated,
                    ..Default::default()
                }],
                ..Default::default()
            },
        )
        .await;

        let ctx = service_provider
            .context(mock_store_a().id, "n/a".to_string())
            .unwrap();

        // Test duplicate status
        service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                UpdateOutboundShipment {
                    id: "test".to_string(),
                    status: Some(UpdateOutboundShipmentStatus::Allocated),
                    ..Default::default()
                },
            )
            .unwrap();
        // Status did not change expect no logs
        assert_eq!(
            get_activity_logs(&connection_manager, None, None, None)
                .unwrap()
                .rows
                .len(),
            0
        );

        // Test correct statuses
        service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                UpdateOutboundShipment {
                    id: "test".to_string(),
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                },
            )
            .unwrap();

        service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                UpdateOutboundShipment {
                    id: "test".to_string(),
                    // Picked again
                    status: Some(UpdateOutboundShipmentStatus::Picked),
                    ..Default::default()
                },
            )
            .unwrap();

        service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                UpdateOutboundShipment {
                    id: "test".to_string(),
                    status: Some(UpdateOutboundShipmentStatus::Shipped),
                    ..Default::default()
                },
            )
            .unwrap();

        let activity_logs = get_activity_logs(
            &connection_manager,
            None,
            None,
            // By default sorted by datetime asc
            None,
        )
        .unwrap()
        .rows;

        assert_eq!(activity_logs.len(), 2);

        assert_eq!(
            activity_logs[0].activity_log_row.r#type,
            ActivityLogType::InvoiceStatusPicked
        );
        assert_eq!(
            activity_logs[1].activity_log_row.r#type,
            ActivityLogType::InvoiceStatusShipped
        );
    }

    #[actix_rt::test]
    async fn system_log_entry_with_custom_datetime_test() {
        let (_, _, connection_manager, _) = setup_all(
            "system_log_entry_with_custom_datetime_test",
            MockDataInserts::none(),
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let repo = SystemLogRowRepository::new(&connection);

        let custom_datetime = NaiveDate::from_ymd_opt(2025, 12, 10)
            .unwrap()
            .and_hms_opt(10, 30, 0)
            .unwrap();

        // Test with custom datetime
        system_log_entry(
            &connection,
            SystemLogType::Migration,
            Some(custom_datetime),
            false,
            SystemLogMessage::Message("Test with custom datetime"),
        )
        .unwrap();

        // Test without datetime (should use current time)
        let before_insert = Utc::now().naive_utc();
        system_log_entry(
            &connection,
            SystemLogType::ServerStatus,
            None,
            false,
            SystemLogMessage::Message("Test without custom datetime"),
        )
        .unwrap();
        let after_insert = Utc::now().naive_utc();

        let logs = repo.find_all().unwrap();
        assert_eq!(logs.len(), 2);

        // First log should have custom datetime
        assert_eq!(logs[0].datetime, custom_datetime);
        assert_eq!(
            logs[0].message,
            Some("Test with custom datetime".to_string())
        );
        assert_eq!(logs[0].r#type, SystemLogType::Migration);

        // Second log should have a datetime within the before/after range
        assert!(logs[1].datetime > before_insert && logs[1].datetime < after_insert);

        assert_eq!(
            logs[1].message,
            Some("Test without custom datetime".to_string())
        );
        assert_eq!(logs[1].r#type, SystemLogType::ServerStatus);
    }

    #[actix_rt::test]
    async fn add_migration_results_to_system_log_test() {
        let (_, _, connection_manager, _) = setup_all(
            "add_migration_results_to_system_log_test",
            MockDataInserts::none(),
        )
        .await;

        let connection = connection_manager.connection().unwrap();
        let repo = SystemLogRowRepository::new(&connection);

        // Create multiple migration results
        let migration_results = vec![
            (
                "Migration 1 completed".to_string(),
                NaiveDate::from_ymd_opt(2025, 12, 01)
                    .unwrap()
                    .and_hms_opt(10, 0, 0)
                    .unwrap(),
            ),
            (
                "Migration 2 completed".to_string(),
                NaiveDate::from_ymd_opt(2025, 12, 01)
                    .unwrap()
                    .and_hms_opt(10, 5, 0)
                    .unwrap(),
            ),
        ];

        // Test the migration log function
        add_migration_results_to_system_log(&connection, migration_results).unwrap();

        let logs = repo.find_all().unwrap();
        assert_eq!(logs.len(), 2);

        assert_eq!(logs[0].r#type, SystemLogType::Migration);
        assert_eq!(logs[0].message, Some("Migration 1 completed".to_string()));

        assert_eq!(logs[1].r#type, SystemLogType::Migration);
        assert_eq!(logs[1].message, Some("Migration 2 completed".to_string()));
    }
}
