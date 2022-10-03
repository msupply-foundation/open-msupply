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
    record_id: String,
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
        record_id: Some(record_id),
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
    store_id: String,
    record_id: String,
) -> Result<(), RepositoryError> {
    let log = &LogRow {
        id: uuid(),
        r#type: log_type,
        user_id: Some(SYSTEM_USER_ID.to_string()),
        store_id: Some(store_id),
        record_id: Some(record_id),
        datetime: Utc::now().naive_utc(),
    };

    Ok(LogRowRepository::new(&connection).insert_one(log)?)
}

pub fn system_invoice_log_entry(
    connection: &StorageConnection,
    status: InvoiceRowStatus,
    store_id: String,
    record_id: String,
) -> Result<(), RepositoryError> {
    let log = &LogRow {
        id: uuid(),
        r#type: match status {
            InvoiceRowStatus::New => LogType::InvoiceCreated,
            InvoiceRowStatus::Allocated => LogType::InvoiceStatusAllocated,
            InvoiceRowStatus::Picked => LogType::InvoiceStatusPicked,
            InvoiceRowStatus::Shipped => LogType::InvoiceStatusShipped,
            InvoiceRowStatus::Delivered => LogType::InvoiceStatusDelivered,
            InvoiceRowStatus::Verified => LogType::InvoiceStatusVerified,
        },
        user_id: Some(SYSTEM_USER_ID.to_string()),
        store_id: Some(store_id),
        record_id: Some(record_id),
        datetime: Utc::now().naive_utc(),
    };

    Ok(LogRowRepository::new(&connection).insert_one(log)?)
}
