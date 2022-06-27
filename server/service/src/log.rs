use repository::{
    Log, LogFilter, LogRepository, LogRow, LogRowRepository, LogSort, StorageConnection,
    StorageConnectionManager,
};
use repository::{PaginationOption, RepositoryError};

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

pub fn log_entry(connection: &StorageConnection, log: &LogRow) -> Result<(), RepositoryError> {
    let repository = LogRowRepository::new(&connection);

    Ok(repository.upsert_one(log)?)
}
