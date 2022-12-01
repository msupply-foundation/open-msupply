use chrono::Utc;
use repository::{
    ActivityLog, ActivityLogFilter, ActivityLogRepository, ActivityLogRow,
    ActivityLogRowRepository, ActivityLogSort, ActivityLogType, InvoiceRowStatus,
    StorageConnection, StorageConnectionManager,
};
use repository::{PaginationOption, RepositoryError};
use util::constants::SYSTEM_USER_ID;
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

use super::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_activity_logs(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<ActivityLogFilter>,
    sort: Option<ActivityLogSort>,
) -> Result<ListResult<ActivityLog>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
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
    event: Option<String>,
) -> Result<(), RepositoryError> {
    let log = &ActivityLogRow {
        id: uuid(),
        r#type: log_type,
        user_id: if ctx.user_id != "" {
            Some(ctx.user_id.clone())
        } else {
            None
        },
        store_id: if ctx.store_id != "" {
            Some(ctx.store_id.clone())
        } else {
            None
        },
        record_id,
        datetime: Utc::now().naive_utc(),
        event,
    };

    Ok(ActivityLogRowRepository::new(&ctx.connection).insert_one(log)?)
}

pub fn activity_log_stock_entry(
    ctx: &ServiceContext,
    log_type: ActivityLogType,
    record_id: Option<String>,
    from: Option<String>,
    to: Option<String>,
) -> Result<(), RepositoryError> {
    let event = Some(format!(
        "Changed from [{}] to [{}]",
        from.unwrap_or_default(),
        to.unwrap_or_default()
    ));

    Ok(activity_log_entry(ctx, log_type, record_id, event)?)
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
        event: None,
    };

    Ok(ActivityLogRowRepository::new(&connection).insert_one(log)?)
}

pub fn log_type_from_invoice_status(status: &InvoiceRowStatus) -> ActivityLogType {
    use ActivityLogType as to;
    use InvoiceRowStatus as from;

    match status {
        from::New => to::InvoiceCreated,
        from::Allocated => to::InvoiceStatusAllocated,
        from::Picked => to::InvoiceStatusPicked,
        from::Shipped => to::InvoiceStatusShipped,
        from::Delivered => to::InvoiceStatusDelivered,
        from::Verified => to::InvoiceStatusVerified,
    }
}

#[cfg(test)]
mod test {
    use crate::{
        invoice::outbound_shipment::{UpdateOutboundShipment, UpdateOutboundShipmentStatus},
        test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
    };
    use repository::{
        mock::{mock_name_a, mock_store_a, MockData, MockDataInserts},
        ActivityLogType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
    };
    use util::inline_init;

    use super::get_activity_logs;

    #[actix_rt::test]
    async fn invoice_activity_log_status() {
        let ServiceTestContext {
            service_provider,
            connection_manager,
            ..
        } = setup_all_with_data_and_service_provider(
            "invoice_log",
            MockDataInserts::none().names().stores(),
            inline_init(|r: &mut MockData| {
                r.invoices = vec![inline_init(|r: &mut InvoiceRow| {
                    r.id = "test".to_string();
                    r.name_id = mock_name_a().id;
                    r.store_id = mock_store_a().id;
                    r.r#type = InvoiceRowType::OutboundShipment;
                    r.status = InvoiceRowStatus::Allocated;
                })]
            }),
        )
        .await;

        let ctx = service_provider
            .context(mock_store_a().id, "n/a".to_string())
            .unwrap();

        // Test dupilcate status
        service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = "test".to_string();
                    r.status = Some(UpdateOutboundShipmentStatus::Allocated)
                }),
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
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = "test".to_string();
                    r.status = Some(UpdateOutboundShipmentStatus::Picked)
                }),
            )
            .unwrap();

        service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = "test".to_string();
                    // Picked again
                    r.status = Some(UpdateOutboundShipmentStatus::Picked)
                }),
            )
            .unwrap();

        service_provider
            .invoice_service
            .update_outbound_shipment(
                &ctx,
                inline_init(|r: &mut UpdateOutboundShipment| {
                    r.id = "test".to_string();
                    r.status = Some(UpdateOutboundShipmentStatus::Shipped)
                }),
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
}
