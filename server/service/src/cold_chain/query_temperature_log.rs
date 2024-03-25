use repository::temperature_log::{
    TemperatureLog, TemperatureLogFilter, TemperatureLogRepository, TemperatureLogSort,
};
use repository::{EqualFilter, PaginationOption, StorageConnection};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
    SingleRecordError,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub fn get_temperature_logs(
    connection: &StorageConnection,
    pagination: Option<PaginationOption>,
    filter: Option<TemperatureLogFilter>,
    sort: Option<TemperatureLogSort>,
) -> Result<ListResult<TemperatureLog>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = TemperatureLogRepository::new(connection);

    Ok(ListResult {
        rows: repository.query(pagination, filter.clone(), sort)?,
        count: i64_to_u32(repository.count(filter)?),
    })
}

pub fn get_temperature_log(
    ctx: &ServiceContext,
    id: String,
) -> Result<TemperatureLog, SingleRecordError> {
    let repository = TemperatureLogRepository::new(&ctx.connection);

    let mut result =
        repository.query_by_filter(TemperatureLogFilter::new().id(EqualFilter::equal_to(&id)))?;

    if let Some(record) = result.pop() {
        Ok(record)
    } else {
        Err(SingleRecordError::NotFound(id))
    }
}
