use chrono::Utc;
use repository::{
    Log, LogFilter, LogRepository, LogRow, LogRowRepository, LogSort, LogType, StorageConnection,
    StorageConnectionManager,
};
use repository::{PaginationOption, RepositoryError};
use util::uuid::uuid;

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

pub fn log_invoice_created(
    connection: &StorageConnection,
    user_id: String,
    record_id: String,
) -> Result<(), RepositoryError> {
    let repository = LogRowRepository::new(&connection);

    Ok(repository.upsert_one(&LogRow {
        id: uuid(),
        log_type: LogType::InvoiceCreated,
        user_id: Some(user_id),
        record_id: Some(record_id),
        created_datetime: Utc::now().naive_utc(),
    })?)
}
