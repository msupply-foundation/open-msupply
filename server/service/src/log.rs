use chrono::Utc;
use repository::{
    InvoiceRowStatus, Log, LogFilter, LogRepository, LogRow, LogRowRepository, LogSort, LogType,
    StorageConnection, StorageConnectionManager,
};
use repository::{PaginationOption, RepositoryError};
use util::constants::SYSTEM_USER_ID;
use util::uuid::uuid;

use crate::service_provider::ServiceContext;

use super::{get_default_pagination, i64_to_u32, ListError, ListResult};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_logs(
    connection_manager: &StorageConnectionManager,
    pagination: Option<PaginationOption>,
    filter: Option<LogFilter>,
    sort: Option<LogSort>,
) -> Result<ListResult<Log>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let connection = connection_manager.connection()?;
    let repository = LogRepository::new(&connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn log_entry(
    ctx: &ServiceContext,
    log_type: LogType,
    record_id: &str,
) -> Result<(), RepositoryError> {
    let log = &LogRow {
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
        record_id: Some(record_id.to_string()),
        datetime: Utc::now().naive_utc(),
    };

    Ok(LogRowRepository::new(&ctx.connection).insert_one(log)?)
}

pub fn log_entry_without_record(
    ctx: &ServiceContext,
    log_type: LogType,
) -> Result<(), RepositoryError> {
    let log = &LogRow {
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
        record_id: None,
        datetime: Utc::now().naive_utc(),
    };

    Ok(LogRowRepository::new(&ctx.connection).insert_one(log)?)
}

pub fn system_log_entry(
    connection: &StorageConnection,
    log_type: LogType,
    store_id: &str,
    record_id: &str,
) -> Result<(), RepositoryError> {
    let log = &LogRow {
        id: uuid(),
        r#type: log_type,
        user_id: Some(SYSTEM_USER_ID.to_string()),
        store_id: Some(store_id.to_string()),
        record_id: Some(record_id.to_string()),
        datetime: Utc::now().naive_utc(),
    };

    Ok(LogRowRepository::new(&connection).insert_one(log)?)
}

pub fn log_type_from_invoice_status(status: &InvoiceRowStatus) -> LogType {
    use InvoiceRowStatus as from;
    use LogType as to;

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
        InvoiceRow, InvoiceRowStatus, InvoiceRowType, LogType,
    };
    use util::inline_init;

    use super::get_logs;

    #[actix_rt::test]
    async fn invoice_log_status() {
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
            get_logs(&connection_manager, None, None, None)
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

        let logs = get_logs(
            &connection_manager,
            None,
            None,
            // By default sorted by datetime asc
            None,
        )
        .unwrap()
        .rows;

        assert_eq!(logs.len(), 2);

        assert_eq!(logs[0].log_row.r#type, LogType::InvoiceStatusPicked);
        assert_eq!(logs[1].log_row.r#type, LogType::InvoiceStatusShipped);
    }
}
